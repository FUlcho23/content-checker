/**
 * 등급 커트라인 기본값 설정
 * 키: 등급, 값: 최소 점수
 */
const DEFAULT_GRADE_CUTOFF = {
    'A+': 95,
    'A0': 90,
    'B+': 85,
    'B0': 80,
    'C+': 75,
    'C0': 70,
    'D+': 65,
    'D0': 60,
    'P': 70,
};

//점수와 등급 컬럼 고정
const DEFAULT_SCORE_COLUMN_KEY = 'FINAL_SCORE';
const DEFAULT_GRADE_COLUMN_KEY = 'FINAL_GRADE';

//기본 필터(검색때 쓸 값)지정 - 사유:함수가 들어간 셀을 만나면 로드하지 못함->어차피 고정된 값들 작성
/* const DEFAULT_FILTER_COLUMNS = [
    'YEAR','SEMESTER','COLLEGE_GROUP','COURSE_CODE','SECTION','USER_LOGIN','FINAL_SCORE','FINAL_GRADE'];  */
const DEFAULT_FILTER_COLUMNS = [
	'COURSE_CODE','SECTION','USER_LOGIN','FINAL_SCORE','FINAL_GRADE'];
const DEFAULT_FILTER_SUBJECT_RE = [
	'이름', '학번', '학과', '재수강','상대평가_제외', 'FINAL_SCORE', 'FINAL_GRADE'
];
const DEFAULT_FILTER_SUBJECT_AE = [
	'이름', '학번', '학과', '재수강', 'FINAL_SCORE', 'FINAL_GRADE'
];

// 예시: 250명 초과 시 버튼 비활성화
const MAX_STUDENTS_FOR_SINGLE_CLASS = 150;


