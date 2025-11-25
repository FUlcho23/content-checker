// -----------------------------
// DOM
// -----------------------------
const subjectSelect = document.getElementById("subjectSelect");
const displayColumns = document.getElementById("displayColumns");
const scoreColumn = document.getElementById("scoreColumn");
const gradeColumn = document.getElementById("gradeColumn");
const nullColumn = document.getElementById("nullColumn");
const checkBtn = document.getElementById("checkBtn");
const resultTableHead = document.querySelector("#resultTable thead tr");
const resultTableBody = document.querySelector("#resultTable tbody");
const toggleDistributionBtn = document.getElementById('toggleDistributionBtn');//토글
const distributionDetailContainer = document.getElementById('gradeDistributionDetail');//토글상세
const fileInput = document.getElementById("fileInput"); // 파일
const loadDataBtn = document.getElementById("loadDataBtn"); // 관련
const fileNameDisplay = document.getElementById("fileNameDisplay"); // 추가
const saveCsvBtn = document.getElementById("saveCsvBtn");//csv파일로 저장
// 예상 등급을 저장할 임시 컬럼 이름 정의
const EXPECTED_GRADE_COLUMN = 'EXPECTED_GRADE_TEMP';
const errorToggle = document.getElementById("errorToggle"); //오류 행만 보기 토글
let isErrorFilterOn = false; //오류 행만 보기 꺼짐 상태
let targetSubjectKey = SUBJECT_COLUMN_KEY;
let targetGradeKey = DEFAULT_GRADE_COLUMN_KEY;
let targetScoreKey = DEFAULT_SCORE_COLUMN_KEY;
let currentFilteredRows = []; // 현재 선택된 과목에 따라 필터링된 데이터
let currentSortColumn = null; // 현재 정렬 기준 컬럼명
let currentSortDirection = 'asc'; // 'asc' (오름차순) 또는 'desc' (내림차순)
let errorRowsToExport = []; // 오류 데이터를 담을 배열
// 등급 커트라인 기본값 (A+ 기준은 95, 나머지는 경계점)
let gradeCutoff = DEFAULT_GRADE_CUTOFF;
const gradePercentCutoff = DEFAULT_PERCENT_CUTOFF;
const gradeCutSettings = document.getElementById("gradeCutSettings"); // 👈 이 부분을 추가해야 합니다.
let allRows = []; // 전체 데이터를 담을 배열 (수업 데이터를 대체)
let uniqueSubjects = []; // 과목 목록을 담을 배열
// 스크립트 로드 시 자동 실행
renderGradePercentUI();
// -----------------------------
// 선택한 과목 → 컬럼 목록 갱신 및 데이터 필터링
// -----------------------------
subjectSelect.addEventListener("change", () => {
    const selectedSubject = subjectSelect.value;
	
    if (selectedSubject === "ALL" || !targetSubjectKey) {
        // 'ALL'이거나 과목 키를 찾지 못했다면 전체 데이터를 사용
        currentFilteredRows = allRows;
    } else {
        //targetSubjectKey를 사용하여 필터링하고 전역 변수에 저장
        currentFilteredRows = allRows.filter(row => row[targetSubjectKey] === selectedSubject);
    }
    if (currentFilteredRows.length === 0 && selectedSubject !== "ALL") {
        console.warn(`선택된 과목 (${selectedSubject})에 데이터가 없습니다.`);
    }
});
// -----------------------------
// 등급 비율 설정 UI 생성 함수
// -----------------------------
function renderGradePercentUI() {
    /// ⚠️ 경고: gradeCutSettings가 null인지 항상 확인해야 합니다.
    if (!gradeCutSettings) {
        console.error("등급 비율 설정 컨테이너(ID: gradeCutSettings)를 찾을 수 없습니다. HTML을 확인하세요.");
        return;
    }
    
    // UI를 생성하기 전에 기존 내용을 비웁니다.
    gradeCutSettings.innerHTML = "<h4>⬇️ 현재 등급별 목표 비율 (%)</h4>";
    
    // 비율을 설정할 등급 그룹 정의 (기존과 동일)
    const percentGrades = [
        { key: 'A', label: 'A+/A' },
        { key: 'B', label: 'B+/B' }
    ];

    percentGrades.forEach(gradeGroup => {
        const inputGroup = document.createElement("div");
        inputGroup.className = "grade-input-group grade-percent-group";
        
        // 라벨 (등급 그룹 이름)
        const label = document.createElement("label");
        label.textContent = `${gradeGroup.label} 목표 비율: `;
        label.style.fontWeight = 'bold'; // 라벨 강조

        // 텍스트 출력 필드 (값)
        const valueSpan = document.createElement("span");
        
        // 전역 객체 gradePercentCutoff에서 현재 저장된 값을 가져와서 표시
        const currentValue = gradePercentCutoff[gradeGroup.key] || 0;
        valueSpan.textContent = currentValue; 
        
        // % 표시
        const percentUnit = document.createElement("span");
        percentUnit.textContent = "%";
        percentUnit.style.marginLeft = '3px';

        // ⭐ 입력 이벤트 리스너 및 input 생성 로직 삭제 ⭐

        inputGroup.appendChild(label);
        inputGroup.appendChild(valueSpan); // ⭐ input 대신 span 추가
        inputGroup.appendChild(percentUnit);
        gradeCutSettings.appendChild(inputGroup);
    });
}
// -----------------------------
// 성적 분포 상세 결과 토글 리스너
// -----------------------------
if (toggleDistributionBtn && gradeDistributionDetail) {
    toggleDistributionBtn.addEventListener('click', () => {
        // ⭐ 1. 숨김 상태 확인
        const isHidden = gradeDistributionDetail.style.display === 'none';
        
        // ⭐ 2. 상세 결과 컨테이너 표시/숨김 토글
        gradeDistributionDetail.style.display = isHidden ? 'block' : 'none';

        // 3. 버튼의 화살표 방향 변경
        const icon = document.getElementById("distributionToggleIcon");
        
        if (icon) {
            if (isHidden) {
                icon.textContent = '▲';
                toggleDistributionBtn.classList.add('toggled');
            } else {
                icon.textContent = '▼';
                toggleDistributionBtn.classList.remove('toggled');
            }
        }
    });
}
// -----------------------------
// 검증 실행
// -----------------------------
checkBtn.addEventListener("click", () => {

    // DOM에서 errorToggle 요소를 가져와 상태를 확인합니다.
    const errorToggle = document.getElementById("errorToggle");

    // ⭐ 1. 토글 상태를 전역 변수에 저장 (renderResultTable에서 사용)
    isErrorFilterOn = errorToggle ? errorToggle.checked : false;

    // ⭐ 필터링 로직 삭제, 전역 변수 사용
    let rows = currentFilteredRows; // 현재 선택된 과목 데이터

    const checkType = document.querySelector("input[name='checkType']:checked");

    if (rows.length === 0) {
        alert("선택된 과목에 데이터가 없습니다. 파일을 로드했는지 확인해주세요.");
        return;
    }

    if (!checkType) {
        alert("검증 조건을 선택해주세요!");
        return;
    }

    // 표시할 컬럼 체크
    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
        .map(cb => cb.value);

    if (selectedColumns.length === 0) {
        alert("표시할 컬럼을 최소 1개 선택해주세요!");
        return;
    }

    // --- 1. 테이블 초기화 및 헤더 렌더링 ---
    resultTableHead.innerHTML = selectedColumns
        .map(col => `<th data-column="${col}">${col}</th>`)
        .join("");

    resultTableBody.innerHTML = "";

    // --- 3. 오류 내보내기 배열 초기화 ---
    errorRowsToExport = [];
    
    // ⭐ 등급별 카운터 초기화: A0/B0 등을 별도로 카운트합니다.
    const gradeCounts = {
        'A+': 0, 'A0': 0, 'B+': 0, 'B0': 0, 
        'C+': 0, 'C0': 0, 'D+': 0, 'D0': 0, 
        'F': 0, 'P': 0, 'NP': 0, 
        '기타': 0,
        '점수 오류/누락': 0 // 점수 오류도 통계에 포함되도록 추가
    }; 

    // --- 4. 데이터 검증 루프 ---
    rows.forEach(row => {
        let isError = false;
        row[EXPECTED_GRADE_COLUMN] = '';

        // ----- ① 점수 → 등급 검증 -----
        if (checkType.value === "gradeCheck") {
            const scoreCol = scoreColumn.value;
            const gradeCol = gradeColumn.value;

            const score = Number(row[scoreCol]);
            const grade = String(row[gradeCol]).toUpperCase();

            // 점수가 없는 경우
            const isScoreInvalid = (isNaN(score) || row[scoreCol] === null || row[scoreCol] === "");

            // 1: 점수 오류/누락
            if (isScoreInvalid) {
                isError = true;
                row[EXPECTED_GRADE_COLUMN] = '점수 오류/누락';
                
                // ⭐ 등급 카운트 (점수 오류)
                gradeCounts['점수 오류/누락']++;
            } else {
                
                // ⭐ 등급 카운트 (정상 데이터)
                let originalGrade = grade;
                if (gradeCounts.hasOwnProperty(originalGrade)) {
                    gradeCounts[originalGrade]++;
                } else if (originalGrade) {
                    // 원본 등급이 예상치 못한 값일 경우
                    gradeCounts['기타']++;
                }

                // P/NP 체계인지 확인 (기존 로직 유지)
                const isPassFailScheme = (grade === 'P' || grade === 'NP');

                if (isPassFailScheme) {
                    // --- 2-1. P/NP 체계 --- (기존 로직 유지)
                    const cutoffP = gradeCutoff['P'] || 0;
                    let expectedGrade_PNP = (score >= cutoffP) ? "P" : "NP";

                    row[EXPECTED_GRADE_COLUMN] = expectedGrade_PNP;

                    if (grade !== expectedGrade_PNP) {
                        isError = true;
                    }

                } else {
                    // --- 2-2. A+~F 체계 --- (기존 로직 유지)
                    const gradeLevels = [
                        { grade: "A+", cutoff: gradeCutoff['A+'] || 0 }, // cutoff 값 없으면 0 처리
                        { grade: "A0",  cutoff: gradeCutoff['A0'] || 0 },
                        { grade: "B+", cutoff: gradeCutoff['B+'] || 0 },
                        { grade: "B0",  cutoff: gradeCutoff['B0'] || 0 },
                        { grade: "C+", cutoff: gradeCutoff['C+'] || 0 },
                        { grade: "C0",  cutoff: gradeCutoff['C0'] || 0 },
                        { grade: "D+", cutoff: gradeCutoff['D+'] || 0 },
                        { grade: "D0",  cutoff: gradeCutoff['D0'] || 0 }
                    ];

                    let expectedGrade = "F";

                    for (const level of gradeLevels) {
                        // gradeCutoff에 값이 없으면 0으로 처리하여 D0 아래는 F가 되도록 보장
                        if (level.cutoff > 0 && score >= level.cutoff) {
                            expectedGrade = level.grade;
                            break;
                        }
                    }

                    row[EXPECTED_GRADE_COLUMN] = expectedGrade;

                    if (grade !== expectedGrade) {
                        isError = true;
                    }
                }
            }
        } 
        // ----- ② NULL / 빈값 검증 -----
        if (checkType.value === "notNull") {
            const col = nullColumn.value;
            const val = row[col];

            if (val === null || val === "") {
                isError = true;
            }
        }

        // ----- 오류 데이터 저장 -----
        if (isError) {
            errorRowsToExport.push(row);
        }
    });

    // 요약 통계 업데이트
    updateSummaryPanel(rows.length, errorRowsToExport.length);

    // ⭐ 5. 등급 분포율 계산 및 렌더링
    const totalStudents = rows.length;
    
    // 카운트가 0인 항목 및 '점수 오류/누락' 항목을 포함한 최종 분포를 계산
    const finalDistribution = calculateDistribution(gradeCounts, totalStudents);
    renderGradeDistributionTextUI(finalDistribution, totalStudents); // 학생 수 전달

    // --- 6. 검증 후 결과 테이블 렌더링 ---
    if (selectedColumns.length > 0 && !currentSortColumn) {
        currentSortColumn = selectedColumns[0];
        currentSortDirection = 'asc';
    }

    renderResultTable(rows, selectedColumns, checkType.value);
});
// -----------------------------
// 데이터 로드 버튼 이벤트 리스너 
// -----------------------------
loadDataBtn.addEventListener('click', () => {
    const files = fileInput.files;
    if (files.length === 0) {
        alert("업로드할 파일을 선택해주세요 (Excel 또는 CSV).");
        return;
    }
	
    const file = files[0];
    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });

            // 첫 번째 시트의 데이터를 읽어옵니다.
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];

            // 시트 데이터를 JSON 배열 형식으로 변환 (헤더를 키로 사용)
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, { 
                header: 1, // 헤더를 배열로 읽어와서
                raw: false, // 데이터를 문자열로 처리 (필요에 따라 true/false 변경 가능)
                defval: null // 빈 셀은 null로 처리
            });

            if (jsonRows.length < 2) {
                alert("데이터가 없습니다. 헤더와 최소 1개의 행이 필요합니다.");
                return;
            }

            // 첫 번째 행을 헤더(컬럼명)로 사용
            const headers = jsonRows[0];

            // 데이터 행들을 객체 배열로 변환
            allRows = jsonRows.slice(1).map(row => {
                const obj = {};
                headers.forEach((header, index) => {
                    // 키-값 매핑. null은 그대로 사용하고, undefined는 처리하지 않음.
                    if (header) { // 헤더가 빈 문자열이 아닌 경우에만 처리
                        obj[header] = row[index];
                    }
                });
                return obj;
            }).filter(obj => Object.keys(obj).length > 0); // 빈 객체는 제외

            // 1. 과목 목록 갱신
            updateSubjectList(); 
            
            // 2. 컬럼 목록 갱신
            renderColumnsOnce();

            // 3. 파일 이름 표시
            fileNameDisplay.innerHTML = `현재 로드된 파일: **${file.name}**`;

            alert(`${file.name} 파일에서 ${allRows.length}개의 데이터 행을 성공적으로 로드했습니다.`);

        } catch (error) {
            console.error("파일 처리 중 오류 발생:", error);
            alert("파일을 읽는 도중 오류가 발생했습니다. 파일 형식을 확인해주세요.");
        }
    };

    reader.onerror = function() {
        alert("파일 읽기 오류가 발생했습니다.");
    };

    // 파일을 ArrayBuffer로 읽기
    reader.readAsArrayBuffer(file);
});
// -----------------------------
// 과목 목록 갱신 함수
// -----------------------------
function updateSubjectList() {
    subjectSelect.innerHTML = ''; // 기존 옵션 초기화

    // 목표 컬럼 키를 고정합니다.
    const fixedTargetSubjectKey = SUBJECT_COLUMN_KEY;
    let subjectKey = null;

    if (allRows.length > 0) {
        const firstRowKeys = Object.keys(allRows[0]);

        // 1. 업로드된 데이터의 헤더에 '과목'이라는 키가 존재하는지 정확히 확인
        if (firstRowKeys.includes(fixedTargetSubjectKey)) {
            subjectKey = fixedTargetSubjectKey;
        }
    }
targetSubjectKey = subjectKey;

    if (subjectKey) {
        // 찾은 subjectKey를 사용하여 유니크한 과목명 추출
        uniqueSubjects = [...new Set(allRows.map(row => row[subjectKey]).filter(name => name))];
    } else {
        // '과목' 컬럼을 찾지 못했을 경우
        uniqueSubjects = [];
        console.warn(`데이터에서 '${fixedTargetSubjectKey}' 컬럼을 찾을 수 없습니다. 업로드 파일의 헤더 이름을 확인해주세요.`);
    }

    const allOption = document.createElement("option");
    allOption.value = "ALL";
    allOption.textContent = "⭐️ 전체 과목 검증";
    subjectSelect.appendChild(allOption);

    uniqueSubjects.forEach(subjectName => {
        const option = document.createElement("option");
        option.value = subjectName;
        option.textContent = subjectName;
        subjectSelect.appendChild(option);
    });

    // 로드 후 첫 번째 항목 선택 및 change 이벤트 트리거
    subjectSelect.value = "ALL"; 
    subjectSelect.dispatchEvent(new Event("change"));
}
// -----------------------------
// CSV 저장 버튼 이벤트 리스너
// -----------------------------
saveCsvBtn.addEventListener("click", () => {

    // 1. 오류 데이터 배열 사용
    const dataToExport = errorRowsToExport;
    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
         .map(cb => cb.value); // 검증 시 선택했던 컬럼 목록을 다시 가져옴

    if (dataToExport.length === 0) {
        alert("저장할 오류 데이터가 없습니다. 검증 결과에 오류가 없거나, 아직 검증을 실행하지 않았습니다.");
        return;
    }
	
// 현재 선택된 검증 타입을 확인 (DOM에서 직접 가져옴)
    const currentCheckType = document.querySelector("input[name='checkType']:checked").value;

// ⭐ 1. 내보낼 최종 컬럼 목록 결정
    let finalExportColumns = [...selectedColumns];

    if (currentCheckType === 'gradeCheck') {
        // '점수 -> 등급 검증' 모드일 경우 '예상 등급' 컬럼을 추가
        finalExportColumns.push(EXPECTED_GRADE_COLUMN); 
    }

    // 2. CSV 내용 구성
    let csv = [];

    // 2a. 헤더 행 처리 (최종 컬럼 목록 사용)
    const headers = finalExportColumns.map(col => {
        // ⭐ 예상 등급 컬럼명 처리
        const headerName = (col === EXPECTED_GRADE_COLUMN) ? '예상 등급' : col;
        return '"' + headerName.replace(/"/g, '""') + '"';
    });
    csv.push(headers.join(','));

    // 2b. 데이터 행 처리 (오류 데이터 배열 사용)
    dataToExport.forEach(row => {
        const rowData = [];
        // ⭐ 최종 컬럼 목록 순회
        finalExportColumns.forEach(col => {
            // 해당 컬럼의 데이터 추출 (예상 등급 컬럼 데이터도 추출됨)
            let cellData = row[col] === null || row[col] === undefined ? "" : String(row[col]);
            // CSV 인코딩: 따옴표와 쉼표 처리
            rowData.push('"' + cellData.replace(/"/g, '""') + '"');
        });
        csv.push(rowData.join(','));
    });

    const csvString = csv.join('\n');

    // 3. 다운로드 실행
    const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const tableName = document.getElementById('subjectSelect').value || '검증결과';
    a.href = url;
    a.download = `${tableName}_오류내역.csv`; // 파일명 변경

    document.body.appendChild(a);
    a.click();
	
    document.body.removeChild(a);
	
    URL.revokeObjectURL(url);
	
    alert(`CSV 파일 다운로드를 시작합니다: ${a.download}`);
});
// -----------------------------
// 컬럼 목록 1회 렌더링 함수 
// -----------------------------
function renderColumnsOnce() {
    // allRows가 비어있으면 헤더를 알 수 없으므로 종료
    if (allRows.length === 0) {
        // 모든 select와 checkbox 영역 초기화
        displayColumns.innerHTML = "";
        scoreColumn.innerHTML = "";
        gradeColumn.innerHTML = "";
        nullColumn.innerHTML = "";
        return; 
    }
    // ⭐ 1. allRows[0]에서 모든 컬럼 목록 추출 (headers)
    const allColumns = Object.keys(allRows[0]); 

    // 표시 컬럼 체크박스 초기화 (기존 로직 유지)
    displayColumns.innerHTML = "";

    // 2. 표시용 컬럼 체크박스 렌더링 (기존 로직 유지)
    allColumns.forEach(col => {
        const label = document.createElement("label");
        label.style.display = "block";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = col;

        // 기본으로 모든 컬럼을 체크하도록 설정
        checkbox.checked = true;

        label.appendChild(checkbox);
        label.append(" " + col);
        displayColumns.appendChild(label);
    });

    // ----------------------------------------------------------------
    // ⭐ 3. 점수/등급/Null 컬럼 선택 <select> 렌더링 (renderColumnSelect 사용) ⭐
    // ----------------------------------------------------------------
    
    // 점수 컬럼 선택 드롭다운 렌더링 (디폴트값 적용)
    // 'scoreColumn'은 DOM 변수 이름이므로 ID는 'scoreColumnSelect'로 가정합니다. 
    // HTML ID가 'scoreColumn'이라면 ID도 'scoreColumn'으로 변경해 주세요.
    renderColumnSelect('scoreColumn', allColumns, targetScoreKey); 
    
    // 등급 컬럼 선택 드롭다운 렌더링 (디폴트값 적용)
    // 'gradeColumn'은 DOM 변수 이름이므로 ID는 'gradeColumnSelect'로 가정합니다. 
    // HTML ID가 'gradeColumn'이라면 ID도 'gradeColumn'으로 변경해 주세요.
    renderColumnSelect('gradeColumn', allColumns, targetGradeKey);

    // Null 검증 컬럼 선택 드롭다운 렌더링 (디폴트 값 없음)
    renderColumnSelect('nullColumn', allColumns, '');
}
// -----------------------------
// 정렬된 결과 테이블 다시 그리기 함수 (수정됨)
// -----------------------------
function renderResultTable(dataRows, selectedColumns, currentCheckType) {

    resultTableBody.innerHTML = ""; // 테이블 내용 초기화

    // ⭐ 1. 필터링 단계 추가: 토글 상태에 따라 렌더링할 행 결정
    let rowsToRender;
	
    // isErrorFilterOn이 true이면 (토글 ON), 오류 데이터(errorRowsToExport)만 필터링하여 사용
    if (isErrorFilterOn) {
        // dataRows (현재 필터링된 과목의 전체 데이터) 중에서
        // errorRowsToExport (검증 결과 오류가 난 데이터)와 일치하는 행만 추출합니다.
        rowsToRender = dataRows.filter(row => errorRowsToExport.includes(row));
    } else {
        // isErrorFilterOn이 false이면 (토글 OFF), 전체 데이터(dataRows)를 사용
        rowsToRender = dataRows;
    }
	
    // 2. 최종 렌더링 컬럼 목록 결정 및 헤더 렌더링
    let finalColumns = [...selectedColumns];

    if (currentCheckType === 'gradeCheck') {
        // '점수 -> 등급 검증' 모드일 경우 '예상 등급' 컬럼을 가장 뒤에 추가
        finalColumns.push(EXPECTED_GRADE_COLUMN); 
    }

    // 헤더 렌더링
	resultTableHead.innerHTML = finalColumns
		.map(col => {
			const displayName = (col === EXPECTED_GRADE_COLUMN) ? '예상 등급' : col;
			
			let sortIndicator = '';
			
			//현재 정렬 컬럼일 경우 표시 추가
			if (col === currentSortColumn) {
				sortIndicator = (currentSortDirection === 'asc' ? ' ▲' : ' ▼');
			}
			
			return `<th data-column="${col}">${displayName}${sortIndicator}</th>`;
		})
		.join("");

    // 3. 데이터 정렬 (rowsToRender를 사용)
    const sortedRows = [...rowsToRender]; // 필터링된 데이터를 복사하여 정렬

    if (currentSortColumn) {
        sortedRows.sort((a, b) => {
            let valA = a[currentSortColumn];
            let valB = b[currentSortColumn];

            // 1. null/undefined/빈 문자열은 가장 아래로 정렬
            const isNullA = (valA === null || valA === undefined || valA === "");
            const isNullB = (valB === null || valB === undefined || valB === "");
            if (isNullA && isNullB) return 0;
            if (isNullA) return currentSortDirection === 'asc' ? 1 : -1;
            if (isNullB) return currentSortDirection === 'asc' ? -1 : 1;

            // 2. 값을 문자열로 변환 (정렬 오류 방지)
            valA = String(valA);
            valB = String(valB);

            // 3. 숫자형 데이터인 경우 숫자로 비교
            const numA = Number(valA);
            const numB = Number(valB);
            const isNumeric = !isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "";

            if (isNumeric) {
                if (numA < numB) return currentSortDirection === 'asc' ? -1 : 1;
                if (numA > numB) return currentSortDirection === 'asc' ? 1 : -1;
                return 0;
            }
            // 4. 문자열 데이터는 localeCompare로 비교
            const comparison = valA.localeCompare(valB);
            return currentSortDirection === 'asc' ? comparison : -comparison;
        });
    }
	
    // 4. 정렬된 데이터를 기반으로 테이블 내용 렌더링
    sortedRows.forEach(row => {
        const tr = document.createElement("tr");
		
        // 오류 데이터 배열에 포함되어 있다면 'error' 클래스 추가
        if (errorRowsToExport.includes(row)) {
            tr.classList.add("error");
        }
        //finalColumns를 순회하며 셀 렌더링
        finalColumns.forEach(col => {
            const td = document.createElement("td");
            // null/undefined 값은 빈 문자열로 표시
            td.textContent = row[col] === null || row[col] === undefined ? "" : row[col];
            //예상 등급 컬럼 스타일링
            if (col === EXPECTED_GRADE_COLUMN) {
                td.style.backgroundColor = '#f0f8ff'; // 연한 파랑 배경
                td.style.fontWeight = '600'; // 강조
            }
            tr.appendChild(td);
        });
        resultTableBody.appendChild(tr);
    });
}
// -----------------------------
// 테이블 헤더 클릭 이벤트 핸들러 (수정)
// -----------------------------
function handleHeaderClick(columnName) {
    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
                                 .map(cb => cb.value);

    // 1. 정렬 기준 업데이트 (기존 로직 유지)
    if (currentSortColumn === columnName) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = columnName;
        currentSortDirection = 'asc';
    }

    // 4. 데이터 필터링 (전역 변수 사용)
    let rows = currentFilteredRows;
    const currentCheckType = document.querySelector("input[name='checkType']:checked").value;

    // 5. 정렬된 데이터로 테이블 다시 렌더링
    renderResultTable(rows, selectedColumns, currentCheckType); // 인수를 모두 전달
	
}
// -----------------------------
// 검증 결과 요약 패널 업데이트 함수 
// -----------------------------
function updateSummaryPanel(totalRows, errorRows) {
    // ID가 'summaryPanel'인 DOM 요소를 가정하고 내용을 업데이트합니다.
    const summaryPanel = document.getElementById('summaryPanel'); 
    if (summaryPanel) {
        // 오류율 계산 (소수점 둘째 자리까지 표시)
        const errorRate = totalRows > 0 ? ((errorRows / totalRows) * 100).toFixed(2) : 0.00;
        summaryPanel.innerHTML = `
                <strong>✅ 검증 결과 요약:</strong> 
                총 검증 대상: <strong>${totalRows}개</strong>, 
                총 오류 발생 행 수: <strong style="color:red;">${errorRows}개</strong> 
                (오류율: ${errorRate}%)
        `;
    }
}
// -----------------------------
// 토글 로직 추가
// -----------------------------
errorToggle.addEventListener("change", () => {
    // 1. 상태 변수 업데이트
    isErrorFilterOn = errorToggle.checked;

    // 2. 현재 선택된 컬럼 목록 가져오기
    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
        .map(cb => cb.value);
    //현재 선택된 검증 타입을 DOM에서 가져옵니다.
    const currentCheckType = document.querySelector("input[name='checkType']:checked").value;

    // 3. 테이블 다시 렌더링
    renderResultTable(currentFilteredRows, selectedColumns, currentCheckType); // 인수를 모두 전달
});
// -----------------------------
// 초기화: 테이블 헤더 클릭 이벤트 위임 설정 (딱 1회 실행)
// -----------------------------
resultTableHead.addEventListener('click', (event) => {
    // 클릭된 요소 또는 가장 가까운 조상 요소 중 'data-column' 속성을 가진 <th> 태그를 찾음
    const headerCell = event.target.closest('th[data-column]');
    
    // <th> 태그를 찾았을 경우만 handleHeaderClick 함수를 실행
    if (headerCell) {
        const columnName = headerCell.dataset.column;
        
        // 커서 스타일링 (CSS로 처리하는 것이 더 좋지만, 여기서는 JS로 처리)
        headerCell.style.cursor = 'pointer'; 
        
        handleHeaderClick(columnName);
    }
});
/**
 * 등급 카운트를 비율(%)로 변환하는 함수
 */
function calculateDistribution(counts, total) {
    const distribution = {};
    if (total === 0) return distribution;

    // 카운트가 0인 항목을 포함하여 모든 항목의 비율을 계산
    for (const grade in counts) {
        distribution[grade] = (counts[grade] / total) * 100;
    }
    return distribution;
}
/**
 * 텍스트 기반 등급 분포 UI 렌더링 함수
 * @param {Object<string, number>} gradeDistributionData - 등급별 비율 데이터 (예: {'A+': 10.5, ...})
 * @param {number} totalStudents - 전체 학생 수
 */
function renderGradeDistributionTextUI(gradeDistributionData, totalStudents) {
    // gradeDistributionDetail는 상세 분포를 보여줄 HTML 요소의 ID여야 합니다.
    const detailContainer = document.getElementById('gradeDistributionDetail');
    if (!detailContainer) {
        console.error("ID가 'gradeDistributionDetail'인 요소를 찾을 수 없습니다.");
        return;
    }

    detailContainer.innerHTML = "<h4>📋 원본 데이터의 등급 분포 상세 (%)</h4>";

    // 등급 순서 정의 (A0, B0 등은 따로 표시하는 것이 일반적)
    const displayOrder = [
        'A+', 'A0', 'B+', 'B0', 'C+', 'C0', 'D+', 'D0', 
        'F', 'P', 'NP', '점수 오류/누락', '기타'
    ];

    // 정의된 순서대로 비율이 0% 초과인 등급만 표시
    displayOrder.forEach(grade => {
        const percentage = gradeDistributionData[grade];
        if (percentage !== undefined && percentage > 0) {
            const distributionItem = document.createElement("div");
            distributionItem.className = "grade-distribution-text-item";
            
            // toFixed(1)로 소수점 첫째 자리까지 표시
            distributionItem.innerHTML = `${grade} 등급: ${percentage.toFixed(1)}%`; 
            detailContainer.appendChild(distributionItem);
        }
    });
    
    // --- 총합 비율 표시 ---
    const totalPercentage = Object.values(gradeDistributionData).reduce((sum, current) => sum + current, 0);

    const totalLine = document.createElement("p");
    totalLine.className = "grade-distribution-total";
    totalLine.style.fontWeight = 'bold';
    totalLine.style.marginTop = '10px';
    totalLine.innerHTML = `전체 학생 수: ${totalStudents}명 (총합 비율: ${totalPercentage.toFixed(1)}%)`;

    detailContainer.appendChild(totalLine);
}
// ------------------------------------------------
// 컬럼 선택 드롭다운 UI 생성 및 기본값 설정 함수
// ------------------------------------------------
function renderColumnSelect(id, columns, defaultValue) {
    // 1. 해당 ID의 <select> 요소를 가져옵니다.
    const selectElement = document.getElementById(id);
    if (!selectElement) return; // 요소가 없으면 종료
    
    selectElement.innerHTML = ''; // 기존 옵션 비우기

    // 기본 "선택 안 함" 옵션 추가
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = `-- 컬럼 선택 --`;
    selectElement.appendChild(defaultOption);

    // 2. CSV 헤더 목록(columns)을 순회하며 옵션을 생성합니다.
    columns.forEach(colName => {
        const option = document.createElement('option');
        option.value = colName;
        option.textContent = colName;
        
        // ⭐ 3. 기본값 설정 로직: 컬럼 이름이 기본값과 일치하면 선택된 상태로 만듭니다.
        if (colName === defaultValue) {
            option.selected = true;
        }

        selectElement.appendChild(option);
    });
}
