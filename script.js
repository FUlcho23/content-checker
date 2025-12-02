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
const toggleCustomLimitBtn = document.getElementById('toggleCustomLimitBtn');
const customLimitSettings = document.getElementById('customLimitSettings');
const customLimitIcon = document.getElementById('customLimitIcon');
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

let customLimits = []; 
const A_GROUP_KEY = 'A_Group'; 
const B_GROUP_KEY = 'B_Group'; 
const OTHER_GROUP_KEY = 'Other_Group';

const limitTypeSelect = document.getElementById('limitTypeSelect'); // 평가 유형 (RE1/RE2) 선택
const limitGroupSelect = document.getElementById('limitGroup'); // 제한 그룹 (A/B) 선택
const limitValueInput = document.getElementById('limitValue'); // 제한 비율 입력 필드
const addLimitBtn = document.getElementById('addLimitBtn'); // 제한 추가 버튼
const customLimitList = document.getElementById('customLimitList'); // 제한 목록 표시 컨테이너

// 로딩 제어 변수
let loadingTimeoutId = null;
const LOADING_THRESHOLD = 50; // 100ms 이내에 완료되면 스피너 표시 안함

// 로딩중...표시
const loading = document.getElementById('loading');
function showLoading() {
    // 이전 타이머가 있다면 취소
    clearTimeout(loadingTimeoutId);
    
    // 임계점(100ms) 후에 실제로 스피너를 보여주도록 타이머 설정
    loadingTimeoutId = setTimeout(() => {
        loading.style.display = 'flex';
    }, LOADING_THRESHOLD);
}
function hideLoading() {
    if (loadingTimeoutId) {
		//A. 만약 타이머가 생기기전이면(100ms안에 끝났다면) 취소
        clearTimeout(loadingTimeoutId);
        loadingTimeoutId = null;
    } else {
        //B. 이미 타이머가 실행되어 스피너가 표시되고 있는 경우 (100ms 초과) 숨김
        loadingOverlay.style.display = 'none';
    }
}

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
if (toggleCustomLimitBtn && customLimitSettings && customLimitIcon) {
    customLimitSettings.classList.add('distribution-hidden');
}
// =================================================================
// 2. 멀티 셀렉트 필터링 로직
// =================================================================
/**
 * 모든 컬럼의 유니크 값 목록을 추출하고, Select2 멀티 셀렉트 UI를 생성합니다.
 * @param {string[]} filterColumns - 필터링에 사용할 컬럼 키 배열 (기본값 또는 모든 컬럼)
 */
function createDynamicFilters(filterColumns) { // 💡 인수 filterColumns를 받음

    // HTML 요소 가져오기
    const dynamicFilterContainer = document.getElementById('dynamic-filter-container');

    // #dynamic-filter-container만 초기화
    if (dynamicFilterContainer) {
        dynamicFilterContainer.innerHTML = '';
    } else {
        console.error("ID 'dynamic-filter-container' 요소를 찾을 수 없습니다.");
        return;
    }

    //필터링할 데이터가 없으면 즉시 종료
    if (allRows.length === 0) return;
    
    // 1. 유니크 값 추출 및 filterOptions 객체 채우기
    filterOptions = {}; // 필터 옵션 초기화

    // 전달받은 filterColumns 인수를 사용하여 반복
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
    activeFilters = {}; //활성 필터 상태 초기화
    
    //전달받은 filterColumns 인수를 사용하여 반복
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
/*
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
            
            const allFileColumns = allRows.length > 0 ? Object.keys(allRows[0]) : [];
			let filterColumnsToUse;
			let scoreKeyFound = allFileColumns.includes(DEFAULT_SCORE_COLUMN_KEY);
			let gradeKeyFound = allFileColumns.includes(DEFAULT_GRADE_COLUMN_KEY);

			if (!scoreKeyFound || !gradeKeyFound) {
				//케이스 0: 필수 점수/등급 키가 없으면 무조건 전체 컬럼 사용
				filterColumnsToUse = allFileColumns;
				targetScoreKey = ''; 
				targetGradeKey = ''; 
				
				alert(`경고: 기본 컬럼 키 (${DEFAULT_SCORE_COLUMN_KEY}, ${DEFAULT_GRADE_COLUMN_KEY})가 파일에 없습니다. 점수/등급 컬럼을 직접 선택하고 필터링할 컬럼을 모두 사용합니다.`);

			} else {
				// 1. DEFAULT_FILTER_COLUMNS (5개) 모두 존재 여부
				const hasAllDefault = DEFAULT_FILTER_COLUMNS.every(key => allFileColumns.includes(key));

				// 2. DEFAULT_FILTER_SUBJECT_RE (7개) 모두 존재 여부
				const hasAllSubjectRE = DEFAULT_FILTER_SUBJECT_RE.every(key => allFileColumns.includes(key));

				// 3. DEFAULT_FILTER_SUBJECT_AE (6개) 모두 존재 여부
				const hasAllSubjectAE = DEFAULT_FILTER_SUBJECT_AE.every(key => allFileColumns.includes(key));


				if (hasAllDefault) {
					// ✅ 우선순위 1
					filterColumnsToUse = DEFAULT_FILTER_COLUMNS;
					
				} else if (hasAllSubjectRE) {
					// ✅ 우선순위 2
					filterColumnsToUse = DEFAULT_FILTER_SUBJECT_RE;
					
				} else if (hasAllSubjectAE) {
					// ✅ 우선순위 3
					filterColumnsToUse = DEFAULT_FILTER_SUBJECT_AE;
					
				} else {
					// ✅ 우선순위 4 (모두 실패)
					filterColumnsToUse = allFileColumns;
				}

				// 필수 키가 존재하므로 기본값 설정
				targetScoreKey = DEFAULT_SCORE_COLUMN_KEY;
				targetGradeKey = DEFAULT_GRADE_COLUMN_KEY;
			}
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
*/
// -----------------------------
// 토글 로직 추가
// -----------------------------
errorToggle.addEventListener("change", () => {
    isErrorFilterOn = errorToggle.checked;
    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
        .map(cb => cb.value);
    const currentCheckType = document.querySelector("input[name='checkType']:checked").value;

	const errorRowSet = new Set(errorRowsToExport);
	
    // currentFilteredRows는 applyAllFilters()를 통해 이미 최신 필터링 상태입니다.
    renderResultTable(currentFilteredRows, selectedColumns, currentCheckType, errorRowSet); 
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
// 테이블 헤더 클릭 이벤트 핸들러 (최적화 및 로딩 제어)
// -----------------------------
function handleHeaderClick(columnName) {
    // 1. 로딩 표시 시작
    showLoading(); 
    
    // 헤더 클릭 시 필요한 모든 전역 상태 업데이트 및 데이터 준비는 동기적으로 진행
    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
                                         .map(cb => cb.value);

    // 정렬 방향 업데이트
    if (currentSortColumn === columnName) {
        currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = columnName;
        currentSortDirection = 'asc';
    }

    const rows = currentFilteredRows; // 현재 필터링된 데이터
    const currentCheckType = document.querySelector("input[name='checkType']:checked").value;
    
    // 2. 부하가 큰 정렬 및 렌더링을 비동기(0ms setTimeout)로 지연 실행
    setTimeout(() => {
        // Set을 생성하고 전달하여 O(1) 탐색 최적화
        const errorRowSet = new Set(errorRowsToExport); 

        // 정렬 및 렌더링은 여기서 단 한 번만 실행됨
        renderResultTable(rows, selectedColumns, currentCheckType, errorRowSet);
        
        // 3. 작업 완료 후 로딩 숨김
        hideLoading(); 
    }, 0);
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
// 검증 실행 (로딩 스피너 제어 및 비동기 처리 적용)
// -----------------------------
checkBtn.addEventListener("click", () => {
    
    // 1. 로딩 시작
	showLoading();
    
    // 이 블록은 동기적으로 실행되는 빠른 유효성 검사 및 변수 초기화입니다.
    const errorToggle = document.getElementById("errorToggle");
    isErrorFilterOn = errorToggle ? errorToggle.checked : false;

    let rows = currentFilteredRows; 
    const checkType = document.querySelector("input[name='checkType']:checked");
    const currentCustomLimits = customLimits; 

    // --- 초기 유효성 검사 (실패 시 반드시 hideLoading() 호출) ---
    if (rows.length === 0) {
        alert("검증 대상 데이터가 없습니다. 파일을 로드하고 필터링 상태를 확인해주세요.");
        hideLoading(); 
        return;
    }

    if (checkType.value === "limitCheck" && currentCustomLimits.length === 0) {
        alert("등급 제한 검증을 위해서는 '평가 유형 선택' 또는 '직접 설정하기'를 통해 제한 비율을 설정해야 합니다.");
        hideLoading(); 
        return;
    }

    if (!checkType) {
        alert("검증 조건을 선택해주세요!");
        hideLoading(); 
        return;
    }

    const selectedColumns = [...displayColumns.querySelectorAll("input:checked")]
        .map(cb => cb.value);

    if (selectedColumns.length === 0) {
        alert("표시할 컬럼을 최소 1개 선택해주세요!");
        hideLoading(); 
        return;
    }

    // --- 초기화 (동기적) ---
    resultTableHead.innerHTML = selectedColumns
        .map(col => `<th data-column="${col}">${col}</th>`)
        .join("");
    resultTableBody.innerHTML = "";

    errorRowsToExport = [];
    
    const gradeCounts = {
        'A+': 0, 'A0': 0, 'B+': 0, 'B0': 0, 
        'C+': 0, 'C0': 0, 'D+': 0, 'D0': 0, 
        'F': 0, 'P': 0, 'NP': 0, 
        '기타': 0,
        '점수 오류/누락': 0 
    }; 
    
    const scoreCol = scoreColumn.value;
    const gradeCol = gradeColumn.value;
    const nullCol = nullColumn ? nullColumn.value : null;

	// 2. 부하가 큰 검증 루프와 모든 렌더링 작업을 비동기 블록으로 이동 (setTimeout)
	setTimeout(() => {
		// --- 4. 데이터 검증 루프 (개별 행 검증 및 통계 수집) ---
		rows.forEach(row => {
			let isError = false;
			row[EXPECTED_GRADE_COLUMN] = '';

			// A. 등급 카운팅 로직 (항상 실행)
			const originalGrade = String(row[gradeCol] || '').toUpperCase();
			
			if (gradeCol && originalGrade) {
				if (gradeCounts.hasOwnProperty(originalGrade)) {
					gradeCounts[originalGrade]++;
				} else {
					gradeCounts['기타']++;
				}
			}

			// B. 개별 검증 실행
			if (checkType.value === "gradeCheck") {
				// runGradeCheck 함수가 정의되어 있어야 합니다.
				const gradeCheckResult = runGradeCheck(row, gradeCol, scoreCol, gradeCutoff);
				
				isError = gradeCheckResult.isError;
				row[EXPECTED_GRADE_COLUMN] = gradeCheckResult.expectedGrade;

				if (gradeCheckResult.isScoreInvalid) {
					// 점수 오류인 경우, 이미 카운트된 원본 등급 카운터를 조정하고 오류 카운트를 증가시킵니다.
					if (gradeCol && originalGrade && gradeCounts.hasOwnProperty(originalGrade)) {
						gradeCounts[originalGrade]--;	
					}
					gradeCounts['점수 오류/누락']++;
				}
			}	
			
			if (checkType.value === "notNull") {
				// runNotNullCheck 함수가 정의되어 있어야 합니다.
				if (nullCol && runNotNullCheck(row, nullCol)) {
					isError = true;
				}
			}
			
			if (isError) {
				errorRowsToExport.push(row);
			}
		});
		
		// --- 4.1. 집단 검증 실행 (등급 제한 검증) ---
		if (checkType.value === "limitCheck") {
			const totalStudents = rows.length;
			// runLimitCheck 함수가 정의되어 있어야 합니다.
			const limitCheckResult = runLimitCheck(gradeCounts, totalStudents, currentCustomLimits);
			
			errorRowsToExport = []; // 제한 검증 시 개별 오류는 없으므로 비움
			
			// renderLimitCheckSummary 함수가 정의되어 있어야 합니다.
			renderLimitCheckSummary(limitCheckResult.isLimitError, limitCheckResult.errorDetails);
		
		} else {
			// --- 5. 요약 통계 업데이트 --- 
			// updateSummaryPanel 함수가 정의되어 있어야 합니다.
			updateSummaryPanel(rows.length, errorRowsToExport.length);
			
			const summaryPanel = document.getElementById('summaryPanel');
			if (summaryPanel) {
				summaryPanel.classList.remove('limit-check-error', 'limit-check-ok');
			}
		}
		
		// --- 4.2. 오류 행 Set 생성 (최적화) ---
		const errorRowSet = new Set(errorRowsToExport);

		// --- 6. 등급 분포율 계산 및 렌더링 ---
		const totalStudents = rows.length;
		// calculateDistribution, renderGradeDistributionTextUI 함수가 정의되어 있어야 합니다.
		const finalDistribution = calculateDistribution(gradeCounts, totalStudents);	
		renderGradeDistributionTextUI(finalDistribution, totalStudents);
		
		// updateGradeDistributionButton 함수가 정의되어 있어야 합니다.
		updateGradeDistributionButton();
		
		// --- 7. 검증 후 결과 테이블 렌더링 ---
		if (selectedColumns.length > 0 && !currentSortColumn) {
			currentSortColumn = selectedColumns[0];
			currentSortDirection = 'asc';
		}

		// renderResultTable 함수가 정의되어 있어야 합니다.
		renderResultTable(rows, selectedColumns, checkType.value, errorRowSet);
		
		// 3. 로딩 끝
		hideLoading();
	}, 0);
});
//---------------------------------------------
//점수/등급 일치 여부를 검사하고 예상 등급을 설정-검증용 필터1
//@param {object} row - 현재 데이터 행 객체
//@param {string} gradeCol - 등급 컬럼 키
//@param {string} scoreCol - 점수 컬럼 키
//@param {object} gradeCutoff - 등급별 커트라인 객체
//@returns {{isError: boolean, expectedGrade: string, isScoreInvalid: boolean}} 검증 결과
//----------------------------------------------
function runGradeCheck(row, gradeCol, scoreCol, gradeCutoff) {
    let isError = false;
    let expectedGrade = '';

    const score = Number(row[scoreCol]);
    const grade = String(row[gradeCol] || '').toUpperCase();

    const isScoreInvalid = (isNaN(score) || row[scoreCol] === null || row[scoreCol] === "");

    if (isScoreInvalid) {
        isError = true;
        expectedGrade = '점수 오류/누락';
        // 이 함수 내에서는 gradeCounts 카운트는 직접 건드리지 않습니다.
    } else {
        const isPassFailScheme = (grade === 'P' || grade === 'NP');

        if (isPassFailScheme) {
            const cutoffP = gradeCutoff['P'] || 0;
            expectedGrade = (score >= cutoffP) ? "P" : "NP";
            if (grade !== expectedGrade) {
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

            expectedGrade = "F";

            for (const level of gradeLevels) {
                if (level.cutoff > 0 && score >= level.cutoff) {
                    expectedGrade = level.grade;
                    break;
                }
            }

            if (grade !== expectedGrade) {
                isError = true;
            }
        }
    }
    
    return { isError, expectedGrade, isScoreInvalid };
}

//---------------------------------
//특정 컬럼의 널값 여부를 검사-검증용 필터2
//@param {object} row - 현재 데이터 행 객체
//@param {string} col - 검사할 컬럼 키
//@returns {boolean} 널값이면 true, 아니면 false
//----------------------------------
function runNotNullCheck(row, col) {
    const val = row[col];
    return (val === null || val === "");
}
//
// 설정된 그룹별 제한 비율에 대해 전체 학생의 등급 분포를 검증합니다.
//@param {object} counts - 현재 계산된 등급 카운트 (gradeCounts)
//@param {number} total - 전체 학생 수
//@param {Array<object>} limits - 설정된 제한 비율 목록 (customLimits)
//@returns {object} { isLimitError: boolean, errorMessage: string, errorDetails: Array }
//
function runLimitCheck(counts, total, limits) {
    let isLimitError = false;
    let errorMessage = "다음과 같은 등급 제한 위반이 발생했습니다:\n";
    const errorDetails = []; // 💡 추가: 상세 오류 정보를 담을 배열

    // 0. 유효성 검사
    if (limits.length === 0 || total === 0) {
        return { isLimitError: false, errorMessage: '', errorDetails: [] };
    }
    
    // 1. 그룹별 현재 누적 등급 수를 계산합니다.
    const cumulativeCounts = {
        'A_Group': (counts['A+'] || 0) + (counts['A0'] || 0), 
        'B_Group': (counts['B+'] || 0) + (counts['B0'] || 0)
    };

    // 2. 설정된 제한 사항을 순회하며 검증합니다.
    limits.forEach(limit => {
        const requiredPercent = limit.maxPercent;
        const groupKey = limit.group;
        let currentCount = 0;
        let groupName = '';

        if (groupKey === 'A_Group') {
            currentCount = cumulativeCounts['A_Group'];
            groupName = 'A 그룹 (A+/A0)';
        
        } else if (groupKey === 'B_Group') {
            // 💡 수정: B 그룹 단독 카운트를 사용합니다.
            currentCount = cumulativeCounts['B_Group']; 
            groupName = 'B 그룹 (B+/B0)'; 
            
        } else {
             // 기타 그룹은 건너뜁니다.
             return; 
        }

        // 현재 비율 계산 (소수점 정밀도를 위해 100을 곱함)
        const currentPercent = (currentCount / total) * 100;

        // 제한 비율 초과 검사
        if (currentPercent > requiredPercent) {
            isLimitError = true;
            errorMessage += `- ${groupName}: 현재 ${currentPercent.toFixed(1)}% (제한: ${requiredPercent}%) 초과\n`;
            
            // 💡 상세 정보 배열에 구조화하여 추가
            errorDetails.push({
                groupName: groupName,
                currentPercent: currentPercent,
                requiredPercent: requiredPercent
            });
        }
    });

    return { 
        isLimitError: isLimitError, 
        errorMessage: isLimitError ? errorMessage : '',
        errorDetails: errorDetails // 💡 최종 결과에 포함
    };
}
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
// 컬럼 목록 1회 렌더링 함수 (DocumentFragment 최적화 적용)
// -----------------------------
function renderColumnsOnce(allColumns) {
    if (allRows.length === 0) {
        displayColumns.innerHTML = "";
        scoreColumn.innerHTML = "";
        gradeColumn.innerHTML = "";
        nullColumn.innerHTML = "";
        return; 
    }

    // 1. 표시 컬럼 체크박스 렌더링 최적화
    displayColumns.innerHTML = "";
    
    //DocumentFragment 생성
    const fragment = document.createDocumentFragment(); 

    allColumns.forEach(col => {
        const label = document.createElement("label");
        label.style.display = "block";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = col;
        checkbox.checked = true;

        label.appendChild(checkbox);
        label.append(" " + col);
        
        //Fragment에 추가
        fragment.appendChild(label); 
    });
    
    //DOM에 한번 추가
    displayColumns.appendChild(fragment); 

    // 2. 점수/등급/Null 컬럼 선택 <select> 렌더링 (기존 함수 재활용)
    renderColumnSelect('scoreColumn', allColumns, targetScoreKey); 
    renderColumnSelect('gradeColumn', allColumns, targetGradeKey);
    renderColumnSelect('nullColumn', allColumns, '');
}

// -----------------------------
// 정렬된 결과 테이블 다시 그리기 함수
// -----------------------------
function renderResultTable(dataRows, selectedColumns, currentCheckType, errorSet) {

    resultTableBody.innerHTML = ""; 

    let rowsToRender;
    
    if (isErrorFilterOn) {
        rowsToRender = dataRows.filter(row => errorSet.has(row));
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
            // 🚨 compareValues 함수를 사용하여 정렬 로직 단순화
            return compareValues(
                a[currentSortColumn], 
                b[currentSortColumn], 
                currentSortDirection
            );
        });
    }
	
	const fragment = document.createDocumentFragment();//데이터 정렬 후 가상DOM생성(DocumentFragment)
    
    // 테이블 내용 렌더링
    sortedRows.forEach(row => {
        const tr = document.createElement("tr");
        
        if (errorSet.has(row)) {
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
        fragment.appendChild(tr);
    });
	resultTableBody.appendChild(fragment);
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
	const totalB = (gradeDistributionData['B+'] || 0) + (gradeDistributionData['B0'] || 0);
    // C 그룹은 '나머지'로 계산 (전체 비율의 합에서 A, B 그룹 비율을 제외)
    const totalPercentageSum = Object.values(gradeDistributionData).reduce((sum, current) => sum + current, 0);
    const totalC = totalPercentageSum - (totalA + totalB); 
    
    // 2. A 그룹 합산 항목 (span) 생성
    const totalALine = document.createElement("span"); 
    totalALine.className = "grade-group-summary";
    totalALine.style.color = '#007bff';
    totalALine.innerHTML = `&emsp;A 그룹 (A+/A0) 합산: ${totalA.toFixed(1)}%`;
    
	// 2. B 그룹 합산 항목 (span) 생성
    const totalBLine = document.createElement("span"); 
    totalBLine.className = "grade-group-summary";
    totalBLine.style.color = '#6f42c1';
    totalBLine.innerHTML = `&emsp;B 그룹 (B+/B0) 합산: ${totalB.toFixed(1)}%`;
	
    // 3. 나머지 그룹 합산 항목 (span) 생성
    const totalCLine = document.createElement("span"); 
    totalCLine.className = "grade-group-summary";
    totalCLine.style.color = '#28a745';
    totalCLine.innerHTML = `&emsp;C 그룹 (나머지) 합산: ${totalC.toFixed(1)}%`;

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
	detailContainer.appendChild(totalCLine);
    
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
// @param {HTMLElement} toggleBtn - 클릭 이벤트를 받을 버튼 요소
// @param {HTMLElement} contentWrapper - 실제로 숨겨지거나 보여질 내용 컨테이너 요소
// @param {HTMLElement} iconElement - 아이콘 텍스트를 담고 있는 요소
// @param {string} hiddenClass - 내용을 숨기는 데 사용되는 CSS 클래스
// @param {string} toggleClass - 버튼 자체에 토글할 클래스(기본값 지정되어있음, 선택사항)
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
//제한 검증 토글 설정
setupGeneralToggle(toggleCustomLimitBtn, customLimitSettings, customLimitIcon, 'distribution-hidden');

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
/**
 * 현재 customLimits 배열의 내용을 HTML 목록으로 렌더링합니다.
 */
function renderCustomLimits() {
    if (!customLimitList) return;

    customLimitList.innerHTML = '';
    
    // customLimits 배열에 아무것도 없으면 기본 메시지를 표시합니다.
    if (customLimits.length === 0) {
        customLimitList.innerHTML = '<p class="text-muted">설정된 제한 비율이 없습니다.</p>';
        return;
    }

    customLimits.forEach((limit, index) => {
        const item = document.createElement('div');
        item.className = 'custom-limit-item';
        // 표시용 그룹 이름 설정
        const groupName = limit.group === A_GROUP_KEY ? 'A 그룹 (A+/A0)' : 
                          limit.group === B_GROUP_KEY ? 'B 그룹 (B+/B0)' : limit.group;

        item.innerHTML = `
            <span>${groupName}: 최대 ${limit.maxPercent}%</span>
            <button class="btn-remove-limit" data-index="${index}">삭제</button>
        `;
        customLimitList.appendChild(item);
    });

    // 삭제 버튼 이벤트 리스너 연결
    customLimitList.querySelectorAll('.btn-remove-limit').forEach(button => {
        button.addEventListener('click', (event) => {
            const index = parseInt(event.target.dataset.index);
            removeCustomLimit(index);
        });
    });
}

/**
 * 사용자가 입력한 제한 비율을 customLimits에 추가합니다.
 */
function addCustomLimit() {
    const group = limitGroupSelect.value;
    const value = parseFloat(limitValueInput.value);

    if (!group || isNaN(value) || value <= 0 || value > 100) {
        alert("그룹을 선택하고 1% ~ 100% 사이의 유효한 비율을 입력해주세요.");
        return;
    }
    
    // 중복 방지: 이미 해당 그룹에 대한 제한이 있으면 덮어씁니다.
    const existingIndex = customLimits.findIndex(limit => limit.group === group);

    if (existingIndex !== -1) {
        // 기존 항목을 업데이트
        customLimits[existingIndex] = { group: group, maxPercent: value };
    } else {
        // 새 항목 추가
        customLimits.push({ group: group, maxPercent: value });
    }
    
    // 입력 필드 초기화 및 목록 갱신
    limitValueInput.value = '';
    renderCustomLimits();
    alert(`제한 비율이 설정되거나 업데이트되었습니다. (${group}: 최대 ${value}%)`);
}

/**
 * customLimits 배열에서 지정된 인덱스의 항목을 제거합니다.
 */
function removeCustomLimit(index) {
    if (index >= 0 && index < customLimits.length) {
        customLimits.splice(index, 1);
        renderCustomLimits();
        alert("제한 비율이 삭제되었습니다.");
    }
}
// -----------------------------
// 등급 제한 설정 이벤트 리스너
// -----------------------------
if (addLimitBtn) {
    addLimitBtn.addEventListener('click', addCustomLimit);
}

// -----------------------------
// 평가 유형(RE1/RE2) 선택 시 기본 제한 로드 이벤트 리스너 추가
// -----------------------------
if (limitTypeSelect) {
    limitTypeSelect.addEventListener('change', () => {
        const selectedType = limitTypeSelect.value;
        let limitsToLoad = null;

        // HTML의 value가 RE1/RE2로 수정되었다고 가정합니다.
        if (selectedType === 'RE1') {
            limitsToLoad = RE1_CUT;
        } else if (selectedType === 'RE2') {
            limitsToLoad = RE2_CUT;
        }

        customLimits = [];
        if (limitsToLoad) {
            for (const groupKey in limitsToLoad) {
                customLimits.push({ group: groupKey, maxPercent: Number(limitsToLoad[groupKey]) });
            }
            // 이 시점에서 customLimits에 값이 채워지므로 검증이 가능해집니다.
            renderCustomLimits(); // 목록 UI 갱신 (만약 renderCustomLimits 함수가 정의되어 있다면)
        } 
    });
}

// -----------------------------
// 초기 상태 렌더링 (파일 로드 전에 호출 가능)
// -----------------------------
renderCustomLimits();

/**
 * 등급 제한 검증 결과 요약을 summaryPanel에 렌더링합니다.
 * @param {boolean} isError - 제한 위반 오류 발생 여부
 * @param {Array<object>} errorDetails - {groupName, currentPercent, requiredPercent} 배열
 */
function renderLimitCheckSummary(isError, errorDetails) {
    const summaryPanel = document.getElementById('summaryPanel');
    if (!summaryPanel) return;
    
    summaryPanel.classList.remove('limit-check-error', 'limit-check-ok'); // 클래스 초기화

    if (isError) {
        let errorHtml = `✅ 등급 제한 위반 발생: `;
        
        errorDetails.forEach(detail => {
            errorHtml += `
                <span style="font-weight:bold; color:red;">[${detail.groupName}]</span> 
                현재: ${detail.currentPercent.toFixed(1)}% (기준: ${detail.requiredPercent.toFixed(1)}%)
            `;
        });
        
        summaryPanel.innerHTML = errorHtml;
        summaryPanel.classList.add('limit-check-error');
        
    } else {
        summaryPanel.innerHTML = '<strong>✅ 등급 제한 검증 결과:</strong> 모든 설정된 제한 기준을 충족합니다.';
        summaryPanel.classList.add('limit-check-ok');
    }
}
/**
 * 두 값을 비교하여 정렬 순서를 결정합니다. (숫자, 문자열, Null 값 처리)
 * @param {*} valA - 첫 번째 값
 * @param {*} valB - 두 번째 값
 * @param {string} direction - 'asc' (오름차순) 또는 'desc' (내림차순)
 * @returns {number} - 정렬 비교 결과 (-1, 0, 1)
 */
function compareValues(valA, valB, direction) {
    // 1. Null/Undefined/빈 문자열 처리 (정렬 시 항상 마지막으로)
    const isNullA = (valA === null || valA === undefined || valA === "");
    const isNullB = (valB === null || valB === undefined || valB === "");
    
    if (isNullA && isNullB) return 0;
    // Null이 아닌 값이 Null 값보다 항상 먼저 오도록 처리
    if (isNullA) return direction === 'asc' ? 1 : -1; 
    if (isNullB) return direction === 'asc' ? -1 : 1;

    // String으로 변환 (숫자형 문자열 비교를 위해)
    const strA = String(valA).trim();
    const strB = String(valB).trim();

    // 2. 숫자형 데이터 처리
    const numA = Number(strA);
    const numB = Number(strB);
    const isNumeric = !isNaN(numA) && !isNaN(numB) && strA !== "" && strB !== "";

    if (isNumeric) {
        if (numA < numB) return direction === 'asc' ? -1 : 1;
        if (numA > numB) return direction === 'asc' ? 1 : -1;
        return 0;
    }
    
    // 3. 문자열 데이터 처리 (LocaleCompare 사용)
    const comparison = strA.localeCompare(strB);
    return direction === 'asc' ? comparison : -comparison;
}
// =================================================================
// worker 초기화 - worker.js를 사용
// =================================================================
const excelWorker = new Worker('worker.js');

// Worker로부터 메시지 수신 처리 (비동기 응답)
excelWorker.onmessage = function(e) {
    const result = e.data;

    // 작업 완료 후 로딩 숨김
    hideLoading();

    if (result.success) {
        // 1. 데이터 업데이트
        allRows = result.data;
        const allFileColumns = result.allFileColumns;
        const filterColumnsToUse = result.filterColumnsToUse;
        
        // 2. 전역 변수 업데이트 (점수/등급 키)
        if (result.targetScoreKey) targetScoreKey = result.targetScoreKey;
        if (result.targetGradeKey) targetGradeKey = result.targetGradeKey;

        // 경고 메시지 로직 (필수 키 누락 시)
        if (!result.targetScoreKey || !result.targetGradeKey) {
            alert(`경고: 기본 컬럼 키 (${DEFAULT_SCORE_COLUMN_KEY}, ${DEFAULT_GRADE_COLUMN_KEY})가 파일에 없습니다. 점수/등급 컬럼을 직접 선택하고 필터링할 컬럼을 모두 사용합니다.`);
        }

        // 3. UI 렌더링 호출
        renderColumnsOnce(allFileColumns);
        createDynamicFilters(filterColumnsToUse);
        
        // 4. 파일명 및 완료 메시지
        fileNameDisplay.innerHTML = `현재 파일: ${result.fileName}`;
        alert(`${result.fileName} 파일에서 ${allRows.length}개의 데이터 행을 성공적으로 로드했습니다.`);
        
        // 5. 버튼 상태 업데이트
        updateGradeDistributionButton();

    } else {
        // 에러 처리
        console.error("Worker 에러:", result.error);
        alert(
            "⚠️ 파일 처리 중 오류가 발생했습니다.\n\n" +
            "이유: " + result.error + "\n\n" +
            "파일 형식이 손상되었거나 암호가 걸려있는지 확인해주세요. 문제가 지속되면 '값만 붙여넣기'하여 새로 저장한 후 시도해주세요."
        );
    }
};

// =================================================================
// 데이터 로드 버튼 이벤트 리스너(loadDataBtn) - worker.js를 사용
// =================================================================
loadDataBtn.addEventListener('click', () => {
    const files = fileInput.files;
    if (files.length === 0) {
        alert("업로드할 파일을 선택해주세요 (Excel 또는 CSV).");
        return;
    }
    
    const file = files[0];
    
    // 1. 로딩 표시 (UI 멈춤 방지용 스피너)
    showLoading();

    // 2. Worker에게 파일 전달 (무거운 작업 시작)
    // 메인 스레드는 즉시 해방되어 로딩 스피너가 부드럽게 돌아갑니다.
    excelWorker.postMessage({ file: file });
});

