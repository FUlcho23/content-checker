importScripts("https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js");
// -----------------------------------------------------------
// [Worker 내부 상수 정의] (기본값.js 내용 포함)
// -----------------------------------------------------------
const DEFAULT_SCORE_COLUMN_KEY = 'FINAL_SCORE';
const DEFAULT_GRADE_COLUMN_KEY = 'FINAL_GRADE';

const DEFAULT_FILTER_COLUMNS = [
    'COURSE_CODE', 'SECTION', 'USER_LOGIN', 'FINAL_SCORE', 'FINAL_GRADE'
];
const DEFAULT_FILTER_SUBJECT_RE = [
    '이름', '학번', '학과', '재수강', '상대평가_제외', 'FINAL_SCORE', 'FINAL_GRADE'
];
const DEFAULT_FILTER_SUBJECT_AE = [
    '이름', '학번', '학과', '재수강', 'FINAL_SCORE', 'FINAL_GRADE'
];

// -----------------------------------------------------------
// [Worker 내부 함수 정의] cleanHeader
// -----------------------------------------------------------
/**
 * 엑셀 헤더 문자열을 표준화된 키로 변환합니다.
 * @param {string} header 원본 헤더 문자열
 * @returns {string | null} 표준화된 키 또는 null
 */
function cleanHeader(header) {
    if (!header || typeof header !== 'string') return null;

    let cleaned = header.trim();

    // 1. 공백 및 특수 문자 단순화
    cleaned = cleaned
        .replace(/\s*\([^)]*\)/g, '') // 괄호 제거 (예: '중간(점수)' -> '중간')
        .replace(/환산점수/g, 'Hwan') // 축약
        .replace(/(소속)(\d)/g, 'Affiliation$2') // 소속 숫자 유지
        .replace(/[^a-zA-Z0-9ㄱ-ㅎ가-힣]/g, '_') // 특수문자 -> 언더바
        .replace(/_{2,}/g, '_') // 연속 언더바 축소
        .replace(/^_|_$/g, ''); // 앞뒤 언더바 제거
    
    // 2. 대문자 변환
    let finalKey = cleaned.toUpperCase();
    
    // 3. 고정 키 매핑
    finalKey = finalKey
        .replace('최종_점수'.toUpperCase(), 'FINAL_SCORE')
        .replace('최종_등급'.toUpperCase(), 'FINAL_GRADE');
        
    return finalKey;
}

// -----------------------------------------------------------
// [메인 로직] 메시지 수신 시 실행
// -----------------------------------------------------------
self.onmessage = function(e) {
    const file = e.data.file;

    if (!file) {
        self.postMessage({ success: false, error: "파일이 전달되지 않았습니다." });
        return;
    }

    // ⭐ 1단계: FileReader 생성 및 readAsArrayBuffer 호출 중 발생하는 동기적 오류를 포착합니다.
    try {
        const reader = new FileReader();

        // -----------------------------------------------------------
        // 1-1. 파일 읽기 성공 (가장 중요)
        // -----------------------------------------------------------
        reader.onload = function(evt) {
            // ⭐ 2단계: 파일 파싱(XLSX.read) 및 데이터 처리 중 발생하는 비동기적 오류를 포착합니다.
            try {
                const data = new Uint8Array(evt.target.result);
                
                // 1. XLSX 파싱 (가장 무거운 작업)
                const workbook = XLSX.read(data, { 
                    type: 'array',
                    formulas: false, 
                    sheets: 0, 
                    bookVBA: false, 
                    bookExt: false
                });
                
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                
                // 2. JSON 변환 (헤더 포함)
                const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
                    header: 1, 
                    raw: false,
                    defval: null,
                    cellDates: true, 
                    cellText: true,
                    cellNF: false
                });

                if (jsonRows.length < 2) {
                    throw new Error("데이터가 없습니다. 헤더와 최소 1개의 행이 필요합니다.");
                }

                // 3. 헤더 정리 및 데이터 매핑
                const fileHeaders = jsonRows[0];
                const cleanedKeys = fileHeaders.map(header => cleanHeader(header));

                const processedRows = jsonRows.slice(1).map(row => {
                    const obj = {};
                    cleanedKeys.forEach((cleanedKey, index) => {
                        const originalValue = row[index];
                        // cleanedKey가 null이 아닌 경우에만 데이터에 포함
                        if (cleanedKey && originalValue !== undefined && originalValue !== null) { 
                            obj[cleanedKey] = originalValue;
                        }
                    });
                    return obj;
                }).filter(obj => Object.keys(obj).length > 0); // 빈 객체 제거

                // 4. 컬럼 필터링 우선순위 로직
                const allFileColumns = processedRows.length > 0 ? Object.keys(processedRows[0]) : [];
                let filterColumnsToUse;
                let targetScoreKey = '';
                let targetGradeKey = '';

                let scoreKeyFound = allFileColumns.includes(DEFAULT_SCORE_COLUMN_KEY);
                let gradeKeyFound = allFileColumns.includes(DEFAULT_GRADE_COLUMN_KEY);

                if (!scoreKeyFound || !gradeKeyFound) {
                    // 필수 키 없음: 전체 컬럼 사용
                    filterColumnsToUse = allFileColumns;
                } else {
                    // 필수 키 존재: 우선순위 로직 적용
                    const hasAllDefault = DEFAULT_FILTER_COLUMNS.every(key => allFileColumns.includes(key));
                    const hasAllSubjectRE = DEFAULT_FILTER_SUBJECT_RE.every(key => allFileColumns.includes(key));
                    const hasAllSubjectAE = DEFAULT_FILTER_SUBJECT_AE.every(key => allFileColumns.includes(key));

                    if (hasAllDefault) {
                        filterColumnsToUse = DEFAULT_FILTER_COLUMNS;
                    } else if (hasAllSubjectRE) {
                        filterColumnsToUse = DEFAULT_FILTER_SUBJECT_RE;
                    } else if (hasAllSubjectAE) {
                        filterColumnsToUse = DEFAULT_FILTER_SUBJECT_AE;
                    } else {
                        filterColumnsToUse = allFileColumns;
                    }
                    targetScoreKey = DEFAULT_SCORE_COLUMN_KEY;
                    targetGradeKey = DEFAULT_GRADE_COLUMN_KEY;
                }

                // 5. 최종 결과 전송 (성공)
                self.postMessage({ 
                    success: true, 
                    data: processedRows,
                    allFileColumns: allFileColumns,
                    filterColumnsToUse: filterColumnsToUse,
                    targetScoreKey: targetScoreKey,
                    targetGradeKey: targetGradeKey,
                    fileName: file.name
                });

            } catch (err) {
                // 파싱/처리 중 에러 발생 시 (실패)
                self.postMessage({ success: false, error: err.message });
            }
        };

        // -----------------------------------------------------------
        // 1-2. 파일 읽기 실패
        // -----------------------------------------------------------
        reader.onerror = function() {
            self.postMessage({ success: false, error: "파일 읽기 실패: 권한 또는 파일 손상 문제" });
        };

        // 파일 읽기 시작 (비동기)
        reader.readAsArrayBuffer(file);

    } catch (err) {
        // ⭐ 1단계에서 포착된 동기적 에러 발생 시 (실패)
        self.postMessage({ success: false, error: "파일 로드 시작 중 오류: " + err.message });
    }
};
