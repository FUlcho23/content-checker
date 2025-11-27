// =================================================================
// 1. DOM 및 전역 변수
// =================================================================
const displayColumns = document.getElementById("displayColumns");
const scoreColumn = document.getElementById("scoreColumn");
const gradeColumn = document.getElementById("gradeColumn");
const nullColumn = document.getElementById("nullColumn");
const checkBtn = document.getElementById("checkBtn");
const resultTableHead = document.querySelector("#resultTable thead tr");
const resultTableBody = document.querySelector("#resultTable tbody");
const distributionDetailContainer = document.getElementById('gradeDistributionDetail');
const fileInput = document.getElementById("fileInput");
const loadDataBtn = document.getElementById("loadDataBtn");
const fileNameDisplay = document.getElementById("fileNameDisplay");
const saveCsvBtn = document.getElementById("saveCsvBtn");
//토글모음
const toggleDistributionBtn = document.getElementById('toggleDistributionBtn');
const filterContainer = document.getElementById("dynamic-filter-container"); // 필터 컨테이너 유지
const toggleFilterBtn = document.getElementById('toggleFilterBtn');//새
const dynamicFilterWrapper = document.getElementById('dynamicFilterWrapper');//토글
const filterToggleIcon = document.getElementById('filterToggleIcon');//친구
const distributionToggleIcon = document.getElementById("distributionToggleIcon");
const toggleColumnsBtn = document.getElementById('toggleColumnsBtn');
const ColumnsToggleIcon = document.getElementById('ColumnsToggleIcon');
// 예상 등급을 저장할 임시 컬럼 이름 정의
const EXPECTED_GRADE_COLUMN = 'EXPECTED_GRADE_TEMP';
const errorToggle = document.getElementById("errorToggle"); //오류 행만 보기 토글

let targetGradeKey = DEFAULT_GRADE_COLUMN_KEY;
let targetScoreKey = DEFAULT_SCORE_COLUMN_KEY;
let currentFilteredRows = []; // 현재 필터링된 데이터
let currentSortColumn = null; 
let currentSortDirection = 'asc'; 
let errorRowsToExport = []; 
let gradeCutoff = DEFAULT_GRADE_CUTOFF;
const gradeCutSettings = document.getElementById("gradeCutSettings"); 
let allRows = []; // 전체 데이터를 담을 배열

// let allColumnKeys = []; // 🚨 초기 선언 제거 (데이터 로드 시점에 추출)
// let uniqueSubjects = []; // 🚨 제거됨

let filterOptions = {};// 모든 컬럼의 필터 데이터 (유니크 값)
let activeFilters = {};// 현재 적용된 필터 조건 {컬럼명: ['값1', '값2'], ...}

let isErrorFilterOn = false; //오류 행만 보기 꺼짐 상태
// -----------------------------
// 초기 실행 로직
// -----------------------------
renderGradePercentUI();
// -----------------------------
// 초기 상태 설정 (script.js 파일 상단)
// -----------------------------
if (dynamicFilterWrapper) {
    dynamicFilterWrapper.classList.remove('filter-hidden'); 
}
if (distributionDetailContainer && distributionToggleIcon && toggleDistributionBtn) {
    // 닫힌 상태로 시작한다고 가정하고 초기 설정
    distributionDetailContainer.classList.add('distribution-hidden');
    toggleDistributionBtn.classList.remove('toggled');
}
if (displayColumns && ColumnsToggleIcon) {
    displayColumns.classList.add('columns-hidden');
}
// =================================================================
// 2. 멀티 셀렉트 필터링 로직
// =================================================================
/**
 * 모든 컬럼의 유니크 값 목록을 추출하고, Select2 멀티 셀렉트 UI를 생성합니다.
 * @param {string[]} filterColumns - 필터링에 사용할 컬럼 키 배열 (기본값 또는 모든 컬럼)
 */
function createDynamicFilters(filterColumns) { // 💡 인수 filterColumns를 받음

    // #filterContainer 초기화 (만약 필터 설정 전체를 감싸는 상위 요소라면)
    // filterContainer.innerHTML = ''; // 이 코드는 주석 처리하겠습니다.

    // HTML 요소 가져오기
    const dynamicFilterContainer = document.getElementById('dynamic-filter-container');

    // #dynamic-filter-container만 초기화
    if (dynamicFilterContainer) {
        dynamicFilterContainer.innerHTML = '';
    } else {
        console.error("ID 'dynamic-filter-container' 요소를 찾을 수 없습니다.");
        return;
    }

    // 💡 초기화: 필터링할 데이터가 없으면 즉시 종료
    if (allRows.length === 0) return;
    
    // 1. 유니크 값 추출 및 filterOptions 객체 채우기
    filterOptions = {}; // 💡 필터 옵션 초기화 (여기서 한 번만 초기화)

    // 💡 수정: 전달받은 filterColumns 인수를 사용하여 반복
    filterColumns.forEach(key => { 
        if (!allRows[0].hasOwnProperty(key)) {
             console.warn(`지정된 필터 컬럼 키 "${key}"가 로드된 데이터에 없습니다.`);
             return;
        }
        
        const allValues = allRows.map(row => {
            const value = row[key];
            if (value === undefined || value === null) {
                return null;
            }
            // 모든 값을 문자열로 변환하고 공백 제거 (일관성 유지)
            return String(value).trim(); 
        }).filter(value => value !== null && value !== '');
        
        // 중복 제거 및 정렬
        const uniqueValues = [...new Set(allValues)].sort((a, b) => String(a).localeCompare(String(b)));
        filterOptions[key] = uniqueValues;
    });
	
	// 2. Select2 UI 렌더링
    activeFilters = {}; // 💡 활성 필터 상태 초기화 (여기서 한 번만 초기화)
    
    // 💡 수정: 전달받은 filterColumns 인수를 사용하여 반복
    filterColumns.forEach(columnKey => { 
        const optionValues = filterOptions[columnKey];
        
        // 유니크 값이 없으면 필터를 만들지 않음
        if (!optionValues || optionValues.length === 0) return; 

        const filterGroup = document.createElement("div");
        filterGroup.className = 'filter-control-group'; 
        filterGroup.innerHTML = `
            <label for="filter-${columnKey}">${columnKey}:</label>
            <select id="filter-${columnKey}" multiple="multiple" style="width: 250px;">
            </select>
        `;
        // 필터 요소들을 #dynamic-filter-container 안에 넣습니다.
        dynamicFilterContainer.appendChild(filterGroup);
        
        const selectElement = $(`#filter-${columnKey}`);
        
        selectElement.select2({
            placeholder: `"${columnKey}"에서 값 선택 (총 ${optionValues.length}개)`,
            allowClear: true,
            // Select2 데이터 형식에 맞게 변환
            data: optionValues.map(v => ({ id: String(v), text: String(v) })),
			dropdownParent: $('body')
        });

        // 필터 변경 시 이벤트 리스너 연결
        selectElement.on('change', function() {
            handleFilterChange(columnKey, $(this).val());
        });
    });
	
    // 3. 필터 적용 로직 호출 (초기 테이블 렌더링 및 필터 상태 반영)
    applyAllFilters();
}


/**
 * 하나의 컬럼 필터가 변경될 때 호출되어 activeFilters를 갱신합니다.
 */
function handleFilterChange(columnKey, selectedValues) {
    if (selectedValues && selectedValues.length > 0) {
        activeFilters[columnKey] = selectedValues.map(String);
    } else {
        delete activeFilters[columnKey];
    }
    
    applyAllFilters();
}

/**
 * 모든 activeFilters를 종합하여 최종적으로 데이터를 필터링하고 currentFilteredRows에 저장합니다.
 */
function applyAllFilters() {
    const activeKeys = Object.keys(activeFilters);
    
    if (activeKeys.length === 0) {
        currentFilteredRows = allRows; 
    } else {
        // 모든 활성 필터를 만족하는 행만 필터링 (AND 조건)
        currentFilteredRows = allRows.filter(row => {
            return activeKeys.every(key => {
                const requiredValues = activeFilters[key];
                const rowValue = String(row[key]);
                return requiredValues.includes(rowValue);
            });
        });
    }

    console.log(`필터링된 행 수: ${currentFilteredRows.length}`);
	//갯수 확인하고 로딩(250이하)
	updateGradeDistributionButton();
}


// =================================================================
// 3. 데이터 로드 및 이벤트 리스너 (멀티 셀렉트와 연동)
// =================================================================
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
            
            // ✅ XLSX.read 옵션: 수식, 매크로, 외부 링크 무시 (가장 강력한 설정)
            const workbook = XLSX.read(data, { 
                type: 'array',
                formulas: false, 
                sheets: 0, 
                bookVBA: false, 
                bookExt: false
            });
            
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            
            // ✅ sheet_to_json 옵션: 계산된 최종 텍스트 값 사용 (수식 결과 로드)
            const jsonRows = XLSX.utils.sheet_to_json(worksheet, {
                header: 1, 
                raw: false,
                defval: null,
                cellDates: true, 
                cellText: true,
                cellNF: false
            });

            if (jsonRows.length < 2) {
                alert("데이터가 없습니다. 헤더와 최소 1개의 행이 필요합니다.");
                return;
            }
            
            const fileHeaders = jsonRows[0];
            
            // ------------------------------------------------------------------
            // 💡 수정된 핵심 로직: 복잡한 헤더를 정리된 키로 변환
            
            // 1. 원본 순서대로 정리된 키 배열 생성
            // (cleanHeader 함수는 외부에서 정의되어 있어야 함)
            const cleanedKeys = fileHeaders.map(header => cleanHeader(header));

            allRows = jsonRows.slice(1).map(row => {
                const obj = {};
                
                // 정리된 키(cleanedKeys)의 인덱스를 기준으로 데이터를 읽어옵니다.
                cleanedKeys.forEach((cleanedKey, index) => {
                    const originalValue = row[index];
                    
                    // 1. 정리된 키가 유효하고 (null이 아니며), 2. 해당 인덱스에 데이터가 존재하면 객체화
                    if (cleanedKey && originalValue !== undefined) { 
                        obj[cleanedKey] = originalValue;
                    }
                });
                return obj;
            }).filter(obj => Object.keys(obj).length > 0);
            
            // ------------------------------------------------------------------
            
            // ------------------------------------------------------------------
            const allFileColumns = allRows.length > 0 ? Object.keys(allRows[0]) : [];
			let filterColumnsToUse;
			let scoreKeyFound = allFileColumns.includes(DEFAULT_SCORE_COLUMN_KEY);
			let gradeKeyFound = allFileColumns.includes(DEFAULT_GRADE_COLUMN_KEY);

			// ------------------------------------------------------------------
			// 💡 핵심 로직 1: 점수/등급 키 필수 체크 (없으면 무조건 전체 컬럼 사용)
			// ------------------------------------------------------------------
			if (!scoreKeyFound || !gradeKeyFound) {
				// ⚠️ 케이스 0: 필수 점수/등급 키가 없으면 무조건 전체 컬럼 사용
				filterColumnsToUse = allFileColumns;
				targetScoreKey = ''; 
				targetGradeKey = ''; 
				
				alert(`경고: 기본 컬럼 키 (${DEFAULT_SCORE_COLUMN_KEY}, ${DEFAULT_GRADE_COLUMN_KEY})가 파일에 없습니다. 점수/등급 컬럼을 직접 선택하고 필터링할 컬럼을 모두 사용합니다.`);

			} else {
				// ------------------------------------------------------------------
				// 💡 핵심 로직 2: 필터 우선순위 체크 (필수 키는 존재하는 경우)
				// ------------------------------------------------------------------
				
				// 1. DEFAULT_FILTER_COLUMNS (5개)가 모두 존재하는지 확인
				const hasAllDefault = DEFAULT_FILTER_COLUMNS.every(key => allFileColumns.includes(key));

				if (hasAllDefault) {
					// ✅ 우선순위 1: 5개 기본 컬럼이 모두 존재하면, 그 5개만 사용
					filterColumnsToUse = DEFAULT_FILTER_COLUMNS;
					
				} else {
					// 2. DEFAULT_FILTER_SUBJECT (7개)가 모두 존재하는지 확인
					const hasAllSubject = DEFAULT_FILTER_SUBJECT.every(key => allFileColumns.includes(key));
					
					if (hasAllSubject) {
						// ✅ 우선순위 2: 7개 과목 컬럼이 모두 존재하면, 그 7개만 사용
						filterColumnsToUse = DEFAULT_FILTER_SUBJECT;
						
					} else {
						// ✅ 우선순위 3: 두 경우 모두 아니면, 전체 파일 컬럼 사용
						filterColumnsToUse = allFileColumns;
					}
				}
				
				// 필수 키가 존재하므로 기본값 설정
				targetScoreKey = DEFAULT_SCORE_COLUMN_KEY;
				targetGradeKey = DEFAULT_GRADE_COLUMN_KEY;
			}
            // ------------------------------------------------------------------
            // 3. 컬럼 목록 갱신 및 필터 생성 (결정된 목록 사용)
			renderColumnsOnce(allFileColumns); // 표시 컬럼은 항상 전체 컬럼 사용
			createDynamicFilters(filterColumnsToUse);
            // 3. 파일 이름 표시
            fileNameDisplay.innerHTML = `현재 파일: ${file.name}`;

            alert(`${file.name} 파일에서 ${allRows.length}개의 데이터 행을 성공적으로 로드했습니다.`);

        } catch (error) {
            console.error("파일 처리 중 치명적인 오류 발생:", error);
            // 🚨 최종 에러 메시지: 수동 변환 가이드 포함
            alert(
                "⚠️ 파일을 로드하는 중 심각한 오류가 발생했습니다.\n\n" +
                "이 오류는 파일 파싱 단계에서 발생하며, 파일 내의 '수식(함수)', '외부 링크', 또는 '손상된 형식' 때문입니다.\n\n" +
                "**✅ 해결책:** 파일을 Excel에서 열고, 모든 데이터를 복사하여 **'값만 붙여넣기'** 후, 새로운 파일로 저장하여 다시 업로드해주세요."
            );
        }
    };

    reader.onerror = function() {
        alert("파일 읽기 오류가 발생했습니다.");
    };
	updateGradeDistributionButton();
    reader.readAsArrayBuffer(file);
});

// -----------------------------
// 토글 로직 추가
// -----------------------------
errorToggle.addEventListener("change", () => {
    isErrorFilterOn = errorToggle.checked;
    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
        .map(cb => cb.value);
    const currentCheckType = document.querySelector("input[name='checkType']:checked").value;

    // currentFilteredRows는 applyAllFilters()를 통해 이미 최신 필터링 상태입니다.
    renderResultTable(currentFilteredRows, selectedColumns, currentCheckType); 
});

// -----------------------------
// 초기화: 테이블 헤더 클릭 이벤트 위임 설정
// -----------------------------
resultTableHead.addEventListener('click', (event) => {
    const headerCell = event.target.closest('th[data-column]');
    
    if (headerCell) {
        const columnName = headerCell.dataset.column;
        headerCell.style.cursor = 'pointer'; 
        handleHeaderClick(columnName);
    }
});

// -----------------------------
// 테이블 헤더 클릭 이벤트 핸들러
// -----------------------------
function handleHeaderClick(columnName) {
    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
                                     .map(cb => cb.value);

    if (currentSortColumn === columnName) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = columnName;
        currentSortDirection = 'asc';
    }

    let rows = currentFilteredRows; // 이미 필터링된 데이터를 사용
    const currentCheckType = document.querySelector("input[name='checkType']:checked").value;

    renderResultTable(rows, selectedColumns, currentCheckType);
}

// -----------------------------
// 등급 비율 설정 UI 생성 함수
// -----------------------------
function renderGradePercentUI() {
    if (!gradeCutSettings) {
        console.error("등급 비율 설정 컨테이너(ID: gradeCutSettings)를 찾을 수 없습니다. HTML을 확인하세요.");
        return;
    }
    gradeCutSettings.innerHTML = "<h4>⬇️ 현재 등급별 목표 비율 (%)</h4>";
    
    const percentGrades = [
        { key: 'A', label: 'A+/A' },
        { key: 'B', label: 'B+/B' }
    ];

    percentGrades.forEach(gradeGroup => {
        const inputGroup = document.createElement("div");
        inputGroup.className = "grade-input-group grade-percent-group";
        
        const label = document.createElement("label");
        label.textContent = `${gradeGroup.label} 목표 비율: `;
        label.style.fontWeight = 'bold'; 

        const valueSpan = document.createElement("span");
        const currentValue = gradePercentCutoff[gradeGroup.key] || 0;
        valueSpan.textContent = currentValue; 
        
        const percentUnit = document.createElement("span");
        percentUnit.textContent = "%";
        percentUnit.style.marginLeft = '3px';

        inputGroup.appendChild(label);
        inputGroup.appendChild(valueSpan); 
        inputGroup.appendChild(percentUnit);
        gradeCutSettings.appendChild(inputGroup);
    });
}

// -----------------------------
// 검증 실행
// -----------------------------
checkBtn.addEventListener("click", () => {
    const errorToggle = document.getElementById("errorToggle");
    isErrorFilterOn = errorToggle ? errorToggle.checked : false;

    let rows = currentFilteredRows; // ✅ 현재 필터링된 데이터를 사용

    const checkType = document.querySelector("input[name='checkType']:checked");

    if (rows.length === 0) {
        alert("검증 대상 데이터가 없습니다. 파일을 로드하고 필터링 상태를 확인해주세요.");
        return;
    }

    if (!checkType) {
        alert("검증 조건을 선택해주세요!");
        return;
    }

    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
        .map(cb => cb.value);

    if (selectedColumns.length === 0) {
        alert("표시할 컬럼을 최소 1개 선택해주세요!");
        return;
    }

    // --- 1. 테이블 헤더 초기화 ---
    resultTableHead.innerHTML = selectedColumns
        .map(col => `<th data-column="${col}">${col}</th>`)
        .join("");
    resultTableBody.innerHTML = "";

    // --- 2. 오류 내보내기 배열 초기화 ---
    errorRowsToExport = [];
    
    // --- 3. 등급별 카운터 초기화 ---
    const gradeCounts = {
        'A+': 0, 'A0': 0, 'B+': 0, 'B0': 0, 
        'C+': 0, 'C0': 0, 'D+': 0, 'D0': 0, 
        'F': 0, 'P': 0, 'NP': 0, 
        '기타': 0,
        '점수 오류/누락': 0 
    }; 

    // --- 4. 데이터 검증 루프 ---
    rows.forEach(row => {
        let isError = false;
        row[EXPECTED_GRADE_COLUMN] = '';

        if (checkType.value === "gradeCheck") {
            const scoreCol = scoreColumn.value;
            const gradeCol = gradeColumn.value;

            const score = Number(row[scoreCol]);
            const grade = String(row[gradeCol]).toUpperCase();

            const isScoreInvalid = (isNaN(score) || row[scoreCol] === null || row[scoreCol] === "");

            if (isScoreInvalid) {
                isError = true;
                row[EXPECTED_GRADE_COLUMN] = '점수 오류/누락';
                gradeCounts['점수 오류/누락']++;
            } else {
                let originalGrade = grade;
                if (gradeCounts.hasOwnProperty(originalGrade)) {
                    gradeCounts[originalGrade]++;
                } else if (originalGrade) {
                    gradeCounts['기타']++;
                }

                const isPassFailScheme = (grade === 'P' || grade === 'NP');

                if (isPassFailScheme) {
                    const cutoffP = gradeCutoff['P'] || 0;
                    let expectedGrade_PNP = (score >= cutoffP) ? "P" : "NP";
                    row[EXPECTED_GRADE_COLUMN] = expectedGrade_PNP;
                    if (grade !== expectedGrade_PNP) {
                        isError = true;
                    }

                } else {
                    const gradeLevels = [
                        { grade: "A+", cutoff: gradeCutoff['A+'] || 0 },
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
        
        if (checkType.value === "notNull") {
            const col = nullColumn.value;
            const val = row[col];

            if (val === null || val === "") {
                isError = true;
            }
        }

        if (isError) {
            errorRowsToExport.push(row);
        }
    });

    // --- 5. 요약 통계 업데이트 ---
    updateSummaryPanel(rows.length, errorRowsToExport.length);

    // --- 6. 등급 분포율 계산 및 렌더링 ---
    const totalStudents = rows.length;
    const finalDistribution = calculateDistribution(gradeCounts, totalStudents);
    renderGradeDistributionTextUI(finalDistribution, totalStudents);
	//한 과목인지 확인(250개 이하인지)
	updateGradeDistributionButton();
    // --- 7. 검증 후 결과 테이블 렌더링 ---
    if (selectedColumns.length > 0 && !currentSortColumn) {
        currentSortColumn = selectedColumns[0];
        currentSortDirection = 'asc';
    }

    renderResultTable(rows, selectedColumns, checkType.value);
});

// -----------------------------
// CSV 저장 버튼 이벤트 리스너
// -----------------------------
saveCsvBtn.addEventListener("click", () => {
    const dataToExport = errorRowsToExport;
    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
           .map(cb => cb.value);

    if (dataToExport.length === 0) {
        alert("저장할 오류 데이터가 없습니다. 검증 결과에 오류가 없거나, 아직 검증을 실행하지 않았습니다.");
        return;
    }
    
    const currentCheckType = document.querySelector("input[name='checkType']:checked").value;

    let finalExportColumns = [...selectedColumns];

    if (currentCheckType === 'gradeCheck') {
        finalExportColumns.push(EXPECTED_GRADE_COLUMN); 
    }

    // 2. CSV 내용 구성
    let csv = [];

    const headers = finalExportColumns.map(col => {
        const headerName = (col === EXPECTED_GRADE_COLUMN) ? '예상 등급' : col;
        return '"' + headerName.replace(/"/g, '""') + '"';
    });
    csv.push(headers.join(','));

    dataToExport.forEach(row => {
        const rowData = [];
        finalExportColumns.forEach(col => {
            let cellData = row[col] === null || row[col] === undefined ? "" : String(row[col]);
            rowData.push('"' + cellData.replace(/"/g, '""') + '"');
        });
        csv.push(rowData.join(','));
    });

    const csvString = csv.join('\n');

    // 3. 다운로드 실행
    const blob = new Blob(["\ufeff" + csvString], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    // (수정) subjectSelect 대신 날짜 및 고정 이름 사용
    const now = new Date();
    const dateString = `${now.getMonth()+1}-${now.getDate()}_${now.getHours()}${now.getMinutes()}`;
    a.href = url;
    a.download = `검증결과_오류내역_${dateString}.csv`; 

    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert(`CSV 파일 다운로드를 시작합니다: ${a.download}`);
});

// -----------------------------
// 컬럼 목록 1회 렌더링 함수 
// -----------------------------
function renderColumnsOnce(allColumns) {
    if (allRows.length === 0) {
        displayColumns.innerHTML = "";
        scoreColumn.innerHTML = "";
        gradeColumn.innerHTML = "";
        nullColumn.innerHTML = "";
        return; 
    }

    // 1. 표시 컬럼 체크박스 렌더링
    displayColumns.innerHTML = "";
    allColumns.forEach(col => {
        const label = document.createElement("label");
        label.style.display = "block";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = col;
        checkbox.checked = true;

        label.appendChild(checkbox);
        label.append(" " + col);
        displayColumns.appendChild(label);
    });

    // 2. 점수/등급/Null 컬럼 선택 <select> 렌더링
    renderColumnSelect('scoreColumn', allColumns, targetScoreKey); 
    renderColumnSelect('gradeColumn', allColumns, targetGradeKey);
    renderColumnSelect('nullColumn', allColumns, '');
}

// -----------------------------
// 정렬된 결과 테이블 다시 그리기 함수
// -----------------------------
function renderResultTable(dataRows, selectedColumns, currentCheckType) {

    resultTableBody.innerHTML = ""; 

    let rowsToRender;
    
    if (isErrorFilterOn) {
        rowsToRender = dataRows.filter(row => errorRowsToExport.includes(row));
    } else {
        rowsToRender = dataRows;
    }
    
    let finalColumns = [...selectedColumns];

    if (currentCheckType === 'gradeCheck') {
        finalColumns.push(EXPECTED_GRADE_COLUMN); 
    }

    // 헤더 렌더링
    resultTableHead.innerHTML = finalColumns
        .map(col => {
            const displayName = (col === EXPECTED_GRADE_COLUMN) ? '예상 등급' : col;
            let sortIndicator = '';
            
            if (col === currentSortColumn) {
                sortIndicator = (currentSortDirection === 'asc' ? ' ▲' : ' ▼');
            }
            
            return `<th data-column="${col}">${displayName}${sortIndicator}</th>`;
        })
        .join("");

    // 데이터 정렬
    const sortedRows = [...rowsToRender]; 

    if (currentSortColumn) {
        sortedRows.sort((a, b) => {
            let valA = a[currentSortColumn];
            let valB = b[currentSortColumn];

            const isNullA = (valA === null || valA === undefined || valA === "");
            const isNullB = (valB === null || valB === undefined || valB === "");
            if (isNullA && isNullB) return 0;
            if (isNullA) return currentSortDirection === 'asc' ? 1 : -1;
            if (isNullB) return currentSortDirection === 'asc' ? -1 : 1;

            valA = String(valA);
            valB = String(valB);

            const numA = Number(valA);
            const numB = Number(valB);
            const isNumeric = !isNaN(numA) && !isNaN(numB) && valA !== "" && valB !== "";

            if (isNumeric) {
                if (numA < numB) return currentSortDirection === 'asc' ? -1 : 1;
                if (numA > numB) return currentSortDirection === 'asc' ? 1 : -1;
                return 0;
            }
            const comparison = valA.localeCompare(valB);
            return currentSortDirection === 'asc' ? comparison : -comparison;
        });
    }
    
    // 테이블 내용 렌더링
    sortedRows.forEach(row => {
        const tr = document.createElement("tr");
        
        if (errorRowsToExport.includes(row)) {
            tr.classList.add("error");
        }
        
        finalColumns.forEach(col => {
            const td = document.createElement("td");
            td.textContent = row[col] === null || row[col] === undefined ? "" : row[col];
            
            if (col === EXPECTED_GRADE_COLUMN) {
                td.style.backgroundColor = '#f0f8ff'; 
                td.style.fontWeight = '600'; 
            }
            tr.appendChild(td);
        });
        resultTableBody.appendChild(tr);
    });
}

// -----------------------------
// 검증 결과 요약 패널 업데이트 함수 
// -----------------------------
function updateSummaryPanel(totalRows, errorRows) {
    const summaryPanel = document.getElementById('summaryPanel'); 
    if (summaryPanel) {
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
// 등급 카운트를 비율(%)로 변환하는 함수
// -----------------------------
function calculateDistribution(counts, total) {
    const distribution = {};
    if (total === 0) return distribution;

    for (const grade in counts) {
        distribution[grade] = (counts[grade] / total) * 100;
    }
    return distribution;
}

// -----------------------------
// 텍스트 기반 등급 분포 UI 렌더링 함수 (막대 그래프 시각화 및 그룹 합산 배치)
// -----------------------------
function renderGradeDistributionTextUI(gradeDistributionData, totalStudents) {
    const detailContainer = document.getElementById('gradeDistributionDetail');
    if (!detailContainer) {
        console.error("ID가 'gradeDistributionDetail'인 요소를 찾을 수 없습니다.");
        return;
    }

    detailContainer.innerHTML = "<h4>📋 원본 데이터의 등급 분포 상세 (%)</h4>";

    const displayOrder = [
        'A+', 'A0', 'B+', 'B0', 'C+', 'C0', 'D+', 'D0', 
        'F', 'P', 'NP', '점수 오류/누락', '기타'
    ];

    // 1. 그룹 합산 비율 계산
    const totalA = (gradeDistributionData['A+'] || 0) + (gradeDistributionData['A0'] || 0);
    // B 그룹은 '나머지'로 계산 (전체 비율의 합에서 A 그룹 비율을 제외)
    const totalPercentageSum = Object.values(gradeDistributionData).reduce((sum, current) => sum + current, 0);
    const totalB = totalPercentageSum - totalA; 
    
    // 2. A 그룹 합산 항목 (span) 생성
    const totalALine = document.createElement("span"); 
    totalALine.className = "grade-group-summary";
    totalALine.style.color = '#007bff';
    totalALine.innerHTML = `&emsp;A 그룹 (A+/A0) 합산: ${totalA.toFixed(1)}%`;
    
    // 3. B 그룹 합산 항목 (span) 생성
    const totalBLine = document.createElement("span"); 
    totalBLine.className = "grade-group-summary";
    totalBLine.style.color = '#28a745';
    totalBLine.innerHTML = `&emsp;B 그룹 (나머지) 합산: ${totalB.toFixed(1)}%`;

    // 4. 등급별 항목 및 막대 그래프 렌더링
    displayOrder.forEach(grade => {
        const percentage = gradeDistributionData[grade];
        // 0% 이상인 항목만 표시
        if (percentage !== undefined && percentage > 0) {
            
            // 1. 등급 항목 DIV 생성
            const distributionItem = document.createElement("div");
            distributionItem.className = "grade-distribution-text-item";
            
            // 2. 텍스트 요소 생성 (왼쪽)
            const gradeText = document.createElement("span");
			gradeText.className = "grade-label"; // 클래스 추가
            gradeText.innerHTML = `${grade} 등급: ${percentage.toFixed(1)}%`;
            distributionItem.appendChild(gradeText);

            // 3. 막대 그래프 컨테이너 및 채우기 막대 생성 (중앙)
            const barContainer = document.createElement("div");
            barContainer.className = "grade-bar-container";
            
            const barFill = document.createElement("div");
            barFill.className = "grade-bar-fill";
            
            // 막대 너비 설정
            barFill.style.width = `${percentage}%`; 
            
            // F 등급이나 오류 등급에 특별한 색상 적용 (옵션)
            if (grade === 'F' || grade.includes('오류')) {
                barFill.style.backgroundColor = 'var(--error-color)'; 
            } else if (grade.startsWith('A')) {
                barFill.style.backgroundColor = '#4a90e2'; // A 등급 전용 색상
            }
            
            barContainer.appendChild(barFill); 
            distributionItem.appendChild(barContainer);
            
            detailContainer.appendChild(distributionItem);
        }
    });
	// 5. 막대 그래프 표시 후, 하단에 그룹 합산 정보 추가
    const separator = document.createElement("hr");
    separator.style.margin = '10px 0';
    detailContainer.appendChild(separator);
    
    detailContainer.appendChild(totalALine);
    detailContainer.appendChild(totalBLine);
    
    // 5. 전체 총합 라인 렌더링
    const totalLine = document.createElement("p");
    totalLine.className = "grade-distribution-total";
    totalLine.style.fontWeight = 'bold';
    totalLine.style.marginTop = '10px';
    totalLine.innerHTML = `전체 학생 수: ${totalStudents}명 (총합 비율: ${totalPercentageSum.toFixed(1)}%)`;

    detailContainer.appendChild(totalLine);
}

// -----------------------------
// 컬럼 선택 드롭다운 UI 생성 및 기본값 설정 함수 
// -----------------------------
function renderColumnSelect(id, columns, defaultValue) {
    
    const selectElement = document.getElementById(id);
    if (!selectElement) return; 
    
    selectElement.innerHTML = ''; 

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = `-- 컬럼 선택 --`;
    selectElement.appendChild(defaultOption);

    columns.forEach(colName => {
        const option = document.createElement('option');
        option.value = colName;
        option.textContent = colName;
        
        if (colName === defaultValue) {
            option.selected = true;
        }

        selectElement.appendChild(option);
    });
}
//===============================================================================
// 범용 토글 함수
// @param {HTMLElement} toggleBtn - 클릭 이벤트를 받을 버튼 요소.
// @param {HTMLElement} contentWrapper - 실제로 숨겨지거나 보여질 내용 컨테이너 요소.
// @param {HTMLElement} iconElement - 아이콘 텍스트를 담고 있는 요소.
// @param {string} hiddenClass - 내용을 숨기는 데 사용되는 CSS 클래스 이름 (예: 'filter-hidden').
// @param {string} toggleClass - (선택 사항) 버튼 자체에 토글할 클래스 (예: 'toggled').
//================================================================================
function setupGeneralToggle(toggleBtn, contentWrapper, iconElement, hiddenClass, toggleClass = null) {
    if (!toggleBtn || !contentWrapper || !iconElement) return;

    toggleBtn.addEventListener('click', () => {
        const isHiddenAfterToggle = contentWrapper.classList.toggle(hiddenClass);
        
        if (isHiddenAfterToggle) {
            iconElement.innerHTML = '▶'; // 닫힘 아이콘 고정
            if (toggleClass) {
                toggleBtn.classList.remove(toggleClass);
            }
        } else {
            iconElement.innerHTML = '▼';   // 열림 아이콘 고정
            if (toggleClass) {
                toggleBtn.classList.add(toggleClass);
            }
        }
    });
}
// 필터 토글 설정
setupGeneralToggle(toggleFilterBtn, dynamicFilterWrapper, filterToggleIcon, 'filter-hidden');
// 성적 분포 토글 설정
setupGeneralToggle(toggleDistributionBtn, distributionDetailContainer, distributionToggleIcon, 'distribution-hidden', 'toggled');
//표시할 컬럼 토글 설정
setupGeneralToggle(toggleColumnsBtn, displayColumns, ColumnsToggleIcon, 'columns-hidden');

//===============================================================================
// 등급 분포 토글 버튼의 활성화 상태 제어
// @param {boolean} enable - true면 활성화, false면 비활성화
//===============================================================================
function controlDistributionToggle(enable) {
    if (toggleDistributionBtn) {
        if (enable) {
            toggleDistributionBtn.disabled = false;
            toggleDistributionBtn.classList.remove('disabled-style'); // CSS 스타일 제거
        } else {
            toggleDistributionBtn.disabled = true;
            toggleDistributionBtn.classList.add('disabled-style'); // 비활성화 스타일 적용
        }
    }
}

//
// 복잡하거나 중복 가능성이 있는 헤더 이름을 프로그램이 처리하기 쉬운 고유한 키로 정리합니다.
// @param {string} header - 원본 헤더 문자열
// @returns {string | null} 정리된 키 또는 null (헤더가 유효하지 않을 경우)
//
function cleanHeader(header) {
    if (!header || typeof header !== 'string') return null;

    let cleaned = header.trim();

    // 1. 공백 및 특수 문자 단순화
    cleaned = cleaned
        // 괄호와 그 안의 내용 제거 (예: "수업참여도 (10%)" -> "수업참여도")
        .replace(/\s*\([^)]*\)/g, '') 
        // "환산점수"를 "HWAN"으로 축약 (나중에 대문자 변환될 것임)
        .replace(/환산점수/g, 'Hwan') 
        // 💡 수정: 소속 뒤의 숫자를 유지합니다. (Affiliation1, Affiliation2)
        .replace(/(소속)(\d)/g, 'Affiliation$2') 
        // 💡 공백 및 나머지 특수문자를 언더바로 대체
        .replace(/[^a-zA-Z0-9ㄱ-ㅎ가-힣]/g, '_') 
        // 연속된 언더바 하나로 축소
        .replace(/_{2,}/g, '_') 
        // 앞뒤 언더바 제거
        .replace(/^_|_$/g, ''); 
    // 2. 최종 키를 대문자로 변환하여 일관성 유지
    let finalKey = cleaned.toUpperCase();
    // 3. 💡 고정된 키 매핑 (toUpperCase() 이후에 적용하여 영문 대문자로 강제 고정)
    finalKey = finalKey
        .replace('최종_점수'.toUpperCase(), 'FINAL_SCORE')
        .replace('최종_등급'.toUpperCase(), 'FINAL_GRADE')
    return finalKey;
}
/**
 * 등급 분포 자세히 보기 버튼의 활성화/비활성화 상태를 업데이트합니다.
 * (현재 필터링된 데이터의 행 개수(수강생 수)를 기준으로 판단)
 */
function updateGradeDistributionButton() {
    // 💡 수정: allRows.length 대신 currentFilteredRows.length 사용
    const currentRowsCount = currentFilteredRows.length;
    
    // MAX_STUDENTS_FOR_SINGLE_CLASS는 전역 상수입니다.
    const isSingleSubjectView = currentRowsCount > 0 && currentRowsCount <= MAX_STUDENTS_FOR_SINGLE_CLASS;

    if (isSingleSubjectView) {
        toggleDistributionBtn.disabled = false;
        toggleDistributionBtn.style.opacity = '1.0';
        toggleDistributionBtn.title = `현재 필터링된 인원(${currentRowsCount}명)이 기준(${MAX_STUDENTS_FOR_SINGLE_CLASS}명) 이하로 활성화되었습니다.`;

    } else {
        toggleDistributionBtn.disabled = true;
        toggleDistributionBtn.style.opacity = '0.5';
        
        if (currentRowsCount === 0) {
             toggleDistributionBtn.title = "데이터가 없어 비활성화됩니다.";
        } else {
             toggleDistributionBtn.title = `현재 필터링된 인원(${currentRowsCount}명)이 기준(${MAX_STUDENTS_FOR_SINGLE_CLASS}명)을 초과하여 비활성화됩니다.`;
        }
        
        // 버튼 비활성화 시 상세 컨테이너는 닫아둡니다.
        distributionDetailContainer.classList.add('distribution-hidden');
        distributionToggleIcon.innerHTML = '▶';
    }
}
