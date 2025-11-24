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
const toggleGradeSettingsBtn = document.getElementById("toggleGradeSettingsBtn");
const gradeCutSettings = document.getElementById("grade-cut-settings");
const fileInput = document.getElementById("fileInput"); // 파일
const loadDataBtn = document.getElementById("loadDataBtn"); // 관련
const fileNameDisplay = document.getElementById("fileNameDisplay"); // 추가
const saveCsvBtn = document.getElementById("saveCsvBtn");//csv파일로 저장
// 예상 등급을 저장할 임시 컬럼 이름 정의
const EXPECTED_GRADE_COLUMN = 'EXPECTED_GRADE_TEMP';
const errorToggle = document.getElementById("errorToggle"); //오류 행만 보기 토글
let isErrorFilterOn = false; //오류 행만 보기 꺼짐 상태
let targetSubjectKey = SUBJECT_COLUMN_KEY;
let currentFilteredRows = []; // 현재 선택된 과목에 따라 필터링된 데이터
let currentSortColumn = null; // 현재 정렬 기준 컬럼명
let currentSortDirection = 'asc'; // 'asc' (오름차순) 또는 'desc' (내림차순)
let errorRowsToExport = []; // 오류 데이터를 담을 배열
// 등급 커트라인 기본값 (A+ 기준은 95, 나머지는 경계점)
let gradeCutoff = DEFAULT_GRADE_CUTOFF;
let allRows = []; // 전체 데이터를 담을 배열 (수업 데이터를 대체)
let uniqueSubjects = []; // 과목 목록을 담을 배열
// 스크립트 로드 시 자동 실행
renderGradeSettingsUI();
// 첫 로딩 시 자동 트리거
renderGradeSettingsUI();//등급 설정 랜더링
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
// 등급 설정 UI 생성 함수 
// -----------------------------
function renderGradeSettingsUI() {
    gradeCutSettings.innerHTML = "<h4>⬇️ 등급별 최소 점수 설정</h4>";
    const grades = ['A+', 'A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'P'];
    grades.forEach(grade => {
        const inputGroup = document.createElement("div");
        inputGroup.className = "grade-input-group";
        
        // 라벨 (등급)
        const label = document.createElement("label");
        label.textContent = `등급 : ${grade}`;

        // 입력 필드 (점수)
        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.max = "100";
        input.value = gradeCutoff[grade];
        input.dataset.grade = grade; // 어떤 등급의 커트라인인지 저장

        // 입력 이벤트 리스너: 값이 변경될 때마다 전역 객체에 저장
        input.addEventListener('change', (e) => {
            const newScore = Number(e.target.value);

            // 입력 필드가 비어있으면 0으로 처리하여 비활성화 기능 지원
            if (e.target.value === "") {
                gradeCutoff[grade] = 0; 
            } else if (newScore >= 0 && newScore <= 100) {
                gradeCutoff[grade] = newScore;
            } else {
                e.target.value = gradeCutoff[grade] || 0; // 유효하지 않으면 원래 값으로 되돌림
            }
        });

        inputGroup.appendChild(label);
        inputGroup.appendChild(input);
        gradeCutSettings.appendChild(inputGroup);
    });
}
// -----------------------------
// 토글 버튼 이벤트 리스너 
// -----------------------------
toggleGradeSettingsBtn.addEventListener('click', () => {

    const isHidden = gradeCutSettings.style.display === 'none';
    gradeCutSettings.style.display = isHidden ? 'block' : 'none';

    // 버튼의 화살표 방향 변경
    const icon = document.getElementById("toggleIcon");
    if (isHidden) {
        icon.textContent = '▲';
        toggleGradeSettingsBtn.classList.add('toggled');
    } else {
        icon.textContent = '▼';
        toggleGradeSettingsBtn.classList.remove('toggled');
    }
});
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

    // --- 2. 헤더에 클릭 이벤트 리스너 연결 ---
//    resultTableHead.querySelectorAll('th').forEach(th => {
//        const columnName = th.dataset.column;
//        th.style.cursor = 'pointer';
//        th.addEventListener('click', () => handleHeaderClick(columnName));
//    });

    // --- 3. 오류 내보내기 배열 초기화 ---
    errorRowsToExport = [];

    // --- 4. 데이터 검증 루프 ---
    rows.forEach(row => {
        let isError = false;              // 오류 여부
        row[EXPECTED_GRADE_COLUMN] = '';  // 예상 등급 초기화

        // ----- ① 점수 → 등급 검증 -----
        if (checkType.value === "gradeCheck") {
            const scoreCol = scoreColumn.value;
            const gradeCol = gradeColumn.value;

            const score = Number(row[scoreCol]);
            const grade = String(row[gradeCol]).toUpperCase();

            // 점수가 없는 경우
            const isScoreInvalid = (isNaN(score) || row[scoreCol] === null);

            // 1: 점수 오류/누락
            if (isScoreInvalid) {
                isError = true;
                row[EXPECTED_GRADE_COLUMN] = '점수 오류/누락';
            } else {

                // P/NP 체계인지 확인
                const isPassFailScheme = (grade === 'P' || grade === 'NP');

                if (isPassFailScheme) {
                    // --- 2-1. P/NP 체계 ---
                    const cutoffP = gradeCutoff['P'] || 0;
                    let expectedGrade_PNP = (score >= cutoffP) ? "P" : "NP";

                    row[EXPECTED_GRADE_COLUMN] = expectedGrade_PNP;

                    if (grade !== expectedGrade_PNP) {
                        isError = true;
                    }

                } else {
                    // --- 2-2. A+~F 체계 ---
                    const gradeLevels = [
                        { grade: "A+", cutoff: gradeCutoff['A+'] },
                        { grade: "A",  cutoff: gradeCutoff['A'] },
                        { grade: "B+", cutoff: gradeCutoff['B+'] },
                        { grade: "B",  cutoff: gradeCutoff['B'] },
                        { grade: "C+", cutoff: gradeCutoff['C+'] },
                        { grade: "C",  cutoff: gradeCutoff['C'] },
                        { grade: "D+", cutoff: gradeCutoff['D+'] },
                        { grade: "D",  cutoff: gradeCutoff['D'] }
                    ];

                    let expectedGrade = "F";

                    for (const level of gradeLevels) {
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

    // --- 5. 검증 후 결과 테이블 렌더링 ---
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
    // 첫 행에서 모든 컬럼 목록 추출
    const firstRow = allRows[0]; 

    // 표시 컬럼 체크박스 초기화
    displayColumns.innerHTML = "";

    // 오류 조건 select 초기화
    scoreColumn.innerHTML = "";
    gradeColumn.innerHTML = "";
    nullColumn.innerHTML = "";

    for (const col in firstRow) {
        // ----- 표시용 체크박스 -----
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

        // ----- 점수/등급/널 검증용 옵션 -----
        const opt1 = document.createElement("option");
        opt1.value = col;
        opt1.textContent = col;

        const opt2 = opt1.cloneNode(true);
        const opt3 = opt1.cloneNode(true);

        scoreColumn.appendChild(opt1);
        gradeColumn.appendChild(opt2);
        nullColumn.appendChild(opt3);
    }
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
// script.js (토글 로직 추가)
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

    // 4. 정렬 표시
    if (currentSortColumn) {
        const initialHeader = resultTableHead.querySelector(`th[data-column="${currentSortColumn}"]`);
        if (initialHeader) {
            initialHeader.textContent += (currentSortDirection === 'asc' ? ' ▲' : ' ▼');
        }
    }
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
