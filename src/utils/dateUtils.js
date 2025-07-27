/**
 * 날짜 관련 유틸리티 함수 모음
 */

/**
 * 특정 년월의 일수를 계산하는 함수
 * @param {number} year - 년도
 * @param {number} month - 월 (0-11)
 * @returns {number} 해당 월의 일수
 */
export const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * 특정 년월의 첫 날 요일을 계산하는 함수
 * @param {number} year - 년도
 * @param {number} month - 월 (0-11)
 * @returns {number} 요일 (0: 일요일, 1: 월요일, ..., 6: 토요일)
 */
export const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

/**
 * 월 이름 목록을 반환하는 함수
 * @returns {string[]} 월 이름 배열
 */
export const generateMonthOptions = () => {
  return [
    '1월', '2월', '3월', '4월', '5월', '6월',
    '7월', '8월', '9월', '10월', '11월', '12월'
  ];
};

/**
 * 특정 년월의 일 목록을 생성하는 함수
 * @param {number} year - 년도
 * @param {number} month - 월 (0-11)
 * @returns {number[]} 일 목록 배열
 */
export const generateDayOptions = (year, month) => {
  const daysInMonth = getDaysInMonth(year, month);
  const days = [];
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }
  return days;
};

/**
 * 현재 년도부터 과거 몇 년까지의 년도 목록을 생성하는 함수
 * @param {number} pastYears - 과거로 거슬러 올라갈 년수 (기본값: 5)
 * @returns {number[]} 년도 목록 배열
 */
export const generateYearOptions = (pastYears = 5) => {
  const currentYear = new Date().getFullYear();
  const years = [];
  for (let i = currentYear - pastYears; i <= currentYear; i++) {
    years.push(i);
  }
  return years;
};

/**
 * 날짜를 포맷팅하는 함수
 * @param {Date} date - 날짜 객체
 * @returns {string} 포맷팅된 날짜 문자열 (예: '2023년 01월 01일')
 */
export const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}년 ${month}월 ${day}일`;
}; 