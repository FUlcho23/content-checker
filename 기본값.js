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

/**
 *  데이터 파일에서 과목 코드를 찾을 컬럼명 설정
 */
const SUBJECT_COLUMN_KEY = 'COURSE_CODE'; 
//현재 설정된 컬럼명 : COURSE_CODE
/**
*비율 넣다 말은거
*/
const DEFAULT_PERCENT_CUTOFF = {
    'A': 30, // A+/A 그룹의 비율
    'B': 30  // B+/B 그룹의 비율
    // 필요한 다른 비율도 추가 가능
};
/**
 * 기본값 설정
 * 점수 컬럼 : FINAL_SCORE
 * 등급 컬럼 : FINAL_GRADE
 */
const DEFAULT_SCORE_COLUMN_KEY = 'FINAL_SCORE';
const DEFAULT_GRADE_COLUMN_KEY = 'FINAL_GRADE';


