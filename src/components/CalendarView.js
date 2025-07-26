import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 월별 일수 계산 함수
const getDaysInMonth = (year, month) => {
  return new Date(year, month + 1, 0).getDate();
};

// 월의 첫 날 요일 계산 함수
const getFirstDayOfMonth = (year, month) => {
  return new Date(year, month, 1).getDay();
};

/**
 * 재사용 가능한 달력 컴포넌트
 * 
 * @param {Object} props
 * @param {Date} props.currentMonth - 현재 표시할 달 (기본값: 현재 날짜)
 * @param {Function} props.onMonthChange - 월 변경 시 호출될 함수 (month: Date)
 * @param {Array} props.markedDates - 표시할 날짜 배열 [{date: Date, type: 'expiry'|'end'|'custom', color: '#color', label: '라벨'}]
 * @param {Object} props.dateRanges - 표시할 날짜 범위 배열 [{startDate: Date, endDate: Date, type: 'expiry'|'end', color: '#color', label: '라벨'}]
 * @param {Object} props.customStyles - 커스텀 스타일 (선택사항)
 * @returns {JSX.Element}
 */
const CalendarView = ({
  currentMonth = new Date(),
  onMonthChange,
  markedDates = [],
  dateRanges = [],
  customStyles = {}
}) => {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  
  // 이전 달로 이동
  const goToPreviousMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1);
    setSelectedMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };
  
  // 다음 달로 이동
  const goToNextMonth = () => {
    const newMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1);
    setSelectedMonth(newMonth);
    if (onMonthChange) {
      onMonthChange(newMonth);
    }
  };
  
  // 날짜가 오늘인지 확인
  const isToday = (date) => {
    const today = new Date();
    return date.getFullYear() === today.getFullYear() && 
           date.getMonth() === today.getMonth() && 
           date.getDate() === today.getDate();
  };
  
  // 오늘 날짜 표시 컴포넌트
  const TodayIndicator = () => (
    <View style={styles.todayIndicator}>
      <Text style={styles.todayIndicatorText}>오늘</Text>
    </View>
  );
  
  // 날짜가 마킹된 날짜인지 확인하고 해당 마킹 정보 반환
  const getMarking = (date) => {
    return markedDates.find(marking => 
      marking.date.getFullYear() === date.getFullYear() && 
      marking.date.getMonth() === date.getMonth() && 
      marking.date.getDate() === date.getDate()
    );
  };
  
  // 날짜에 해당하는 모든 마킹 정보 반환
  const getAllMarkings = (date) => {
    return markedDates.filter(marking => 
      marking.date.getFullYear() === date.getFullYear() && 
      marking.date.getMonth() === date.getMonth() && 
      marking.date.getDate() === date.getDate()
    );
  };
  
  // 날짜가 특정 범위에 속하는지 확인하고 해당 범위 정보 반환
  const getDateRangeInfo = (date) => {
    const ranges = [];
    
    dateRanges.forEach(range => {
      const startDate = new Date(range.startDate);
      const endDate = new Date(range.endDate);
      
      // 시간 정보 제거 (날짜만 비교)
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(0, 0, 0, 0);
      const checkDate = new Date(date);
      checkDate.setHours(0, 0, 0, 0);
      
      // 날짜가 범위 내에 있는지 확인
      if (checkDate >= startDate && checkDate <= endDate) {
        // 시작일, 끝일, 중간일 여부 확인
        const isStartDate = checkDate.getTime() === startDate.getTime();
        const isEndDate = checkDate.getTime() === endDate.getTime();
        
        ranges.push({
          ...range,
          isStartDate,
          isEndDate,
          isMiddleDate: !isStartDate && !isEndDate
        });
      }
    });
    
    return ranges.length > 0 ? ranges : null;
  };
  
  // 달력 렌더링
  const renderCalendar = () => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayOfMonth = getFirstDayOfMonth(year, month);
    
    const days = [];
    
    // 이전 달의 날짜로 빈 칸 채우기
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    
    // 현재 달의 날짜 채우기
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isTodayDate = isToday(date);
      const markings = getAllMarkings(date);
      const rangeInfo = getDateRangeInfo(date);
      
      const hasExpiryMarking = markings.some(m => m.type === 'expiry');
      const hasEndMarking = markings.some(m => m.type === 'end');
      const hasCustomMarking = markings.some(m => m.type === 'custom');
      
      // 날짜 범위 스타일 계산
      const rangeStyles = [];
      const rangeTextStyles = [];
      
      if (rangeInfo) {
        // 범위 타입별로 분리
        const expiryRanges = rangeInfo.filter(range => range.type === 'expiry');
        const endRanges = rangeInfo.filter(range => range.type === 'end');
        const otherRanges = rangeInfo.filter(range => range.type !== 'expiry' && range.type !== 'end');
        
        // 소진예상일 범위 먼저 처리 (아래에 표시)
        endRanges.forEach(range => {
          const baseColor = '#4CAF50'; // 소진예상일 색상
          const bgColor = `${baseColor}15`; // 15% 투명도
          
          // 소진예상일 범위 스타일 (점선)
          if (range.isStartDate) {
            rangeStyles.push({
              backgroundColor: bgColor,
              borderLeftWidth: 1.5,
              borderTopWidth: 1.5,
              borderBottomWidth: 1.5,
              borderLeftColor: baseColor,
              borderTopColor: baseColor,
              borderBottomColor: baseColor,
              borderStyle: 'dashed',
              borderTopLeftRadius: 10,
              borderBottomLeftRadius: 10,
              marginRight: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
            });
          }
          else if (range.isEndDate) {
            rangeStyles.push({
              backgroundColor: bgColor,
              borderRightWidth: 1.5,
              borderTopWidth: 1.5,
              borderBottomWidth: 1.5,
              borderRightColor: baseColor,
              borderTopColor: baseColor,
              borderBottomColor: baseColor,
              borderStyle: 'dashed',
              borderTopRightRadius: 10,
              borderBottomRightRadius: 10,
              marginLeft: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
            });
          }
          else if (range.isMiddleDate) {
            rangeStyles.push({
              backgroundColor: bgColor,
              borderTopWidth: 1.5,
              borderBottomWidth: 1.5,
              borderTopColor: baseColor,
              borderBottomColor: baseColor,
              borderStyle: 'dashed',
              marginLeft: 0,
              marginRight: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1,
            });
          }
        });
        
        // 유통기한 범위 처리 (위에 표시)
        expiryRanges.forEach(range => {
          const baseColor = '#2196F3'; // 유통기한 색상
          
          // 유통기한 범위 스타일 (실선)
          if (range.isStartDate) {
            rangeStyles.push({
              borderLeftWidth: 2,
              borderTopWidth: 2,
              borderBottomWidth: 2,
              borderLeftColor: baseColor,
              borderTopColor: baseColor,
              borderBottomColor: baseColor,
              borderStyle: 'solid',
              borderTopLeftRadius: 10,
              borderBottomLeftRadius: 10,
              marginRight: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2, // 소진예상일보다 위에 표시
            });
          }
          else if (range.isEndDate) {
            rangeStyles.push({
              borderRightWidth: 2,
              borderTopWidth: 2,
              borderBottomWidth: 2,
              borderRightColor: baseColor,
              borderTopColor: baseColor,
              borderBottomColor: baseColor,
              borderStyle: 'solid',
              borderTopRightRadius: 10,
              borderBottomRightRadius: 10,
              marginLeft: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
            });
          }
          else if (range.isMiddleDate) {
            rangeStyles.push({
              borderTopWidth: 2,
              borderBottomWidth: 2,
              borderTopColor: baseColor,
              borderBottomColor: baseColor,
              borderStyle: 'solid',
              marginLeft: 0,
              marginRight: 0,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 2,
            });
          }
        });
        
        // 기타 범위 처리
        otherRanges.forEach(range => {
          // 기존 코드와 동일하게 처리
        });
      }
      
      days.push(
        <View 
          key={`day-${day}`} 
          style={[
            styles.calendarDay,
            hasExpiryMarking && styles.expiryDay,
            hasEndMarking && styles.endDay,
            isTodayDate && styles.todayDay,
            hasCustomMarking && { backgroundColor: `${markings.find(m => m.type === 'custom')?.color}20` },
            hasCustomMarking && { borderColor: markings.find(m => m.type === 'custom')?.color, borderWidth: 1 },
            customStyles.calendarDay
          ]}
        >
          {rangeStyles.length > 0 && rangeStyles.map((style, index) => (
            <View key={`range-${index}`} style={style} />
          ))}
          {isTodayDate && <View style={styles.todayHighlight} />}
          <Text style={[
            styles.calendarDayText,
            hasExpiryMarking && styles.expiryDayText,
            hasEndMarking && styles.endDayText,
            isTodayDate && styles.todayDayText,
            hasCustomMarking && { color: markings.find(m => m.type === 'custom')?.color },
            ...rangeTextStyles,
            customStyles.calendarDayText
          ]}>
            {day}
          </Text>
          {hasExpiryMarking && <View style={styles.expiryDot} />}
          {hasEndMarking && <View style={styles.endDot} />}
          {hasCustomMarking && (
            <View style={[styles.customDot, { backgroundColor: markings.find(m => m.type === 'custom')?.color }]} />
          )}
        </View>
      );
    }
    
    // 다음 달의 날짜로 남은 칸 채우기 (7의 배수로 맞추기 위해)
    const totalDays = firstDayOfMonth + daysInMonth;
    const remainingDays = 7 - (totalDays % 7);
    if (remainingDays < 7) {
      for (let i = 0; i < remainingDays; i++) {
        days.push(<View key={`next-${i}`} style={styles.calendarDay} />);
      }
    }
    
    return days;
  };
  
  return (
    <View style={[styles.calendarContainer, customStyles.calendarContainer]}>
      <View style={[styles.calendarHeader, customStyles.calendarHeader]}>
        <TouchableOpacity onPress={goToPreviousMonth}>
          <Ionicons name="chevron-back" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <Text style={[styles.calendarTitle, customStyles.calendarTitle]}>
          {selectedMonth.getFullYear()}년 {selectedMonth.getMonth() + 1}월
        </Text>
        <TouchableOpacity onPress={goToNextMonth}>
          <Ionicons name="chevron-forward" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>
      
      <View style={[styles.calendarWeekdays, customStyles.calendarWeekdays]}>
        {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
          <Text 
            key={`weekday-${index}`} 
            style={[
              styles.calendarWeekday, 
              index === 0 && styles.sundayText,
              index === 6 && styles.saturdayText,
              customStyles.calendarWeekday
            ]}
          >
            {day}
          </Text>
        ))}
      </View>
      
      <View style={[styles.calendarDays, customStyles.calendarDays]}>
        {renderCalendar()}
      </View>
      
      {/* 범례 */}
      <View style={[styles.calendarLegend, customStyles.calendarLegend]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { 
            backgroundColor: '#FF5722', 
            width: 12, 
            height: 12, 
            borderRadius: 6 
          }]} />
          <Text style={styles.legendText}>오늘</Text>
        </View>
        {markedDates.some(m => m.type === 'expiry') && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.expiryLegendDot]} />
            <Text style={styles.legendText}>유통기한</Text>
          </View>
        )}
        {markedDates.some(m => m.type === 'end') && (
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.endLegendDot]} />
            <Text style={styles.legendText}>소진 예상일</Text>
          </View>
        )}
        {dateRanges.some(r => r.type === 'expiry') && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { 
              backgroundColor: '#2196F320', 
              borderColor: '#2196F3',
              borderStyle: 'solid',
              borderWidth: 2
            }]} />
            <Text style={styles.legendText}>구매일~유통기한</Text>
          </View>
        )}
        {dateRanges.some(r => r.type === 'end') && (
          <View style={styles.legendItem}>
            <View style={[styles.legendLine, { 
              backgroundColor: '#4CAF5020', 
              borderColor: '#4CAF50',
              borderStyle: 'dashed',
              borderWidth: 1.5
            }]} />
            <Text style={styles.legendText}>구매일~소진예상</Text>
          </View>
        )}
        {markedDates
          .filter(m => m.type === 'custom' && m.label)
          .map((marking, index) => (
            <View key={`legend-${index}`} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendDot, 
                  { backgroundColor: marking.color || '#666' }
                ]} 
              />
              <Text style={styles.legendText}>{marking.label}</Text>
            </View>
          ))
        }
        {dateRanges
          .filter(r => r.type === 'custom' && r.label)
          .map((range, index) => (
            <View key={`range-legend-${index}`} style={styles.legendItem}>
              <View 
                style={[
                  styles.legendLine, 
                  { 
                    backgroundColor: `${range.color || '#666'}20`,
                    borderColor: range.color || '#666' 
                  }
                ]} 
              />
              <Text style={styles.legendText}>{range.label}</Text>
            </View>
          ))
        }
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  calendarContainer: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginTop: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  calendarTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    marginBottom: 5,
  },
  calendarWeekday: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
    width: '14.28%',
    textAlign: 'center',
  },
  sundayText: {
    color: '#F44336',
  },
  saturdayText: {
    color: '#2196F3',
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 5,
  },
  calendarDay: {
    width: '14.28%', // 정확히 7일로 나누기 위해 14.28%로 설정
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6, // 위아래 간격 늘림
    borderRadius: 10,
    overflow: 'visible', // 중첩된 범위가 잘리지 않도록 설정
    minHeight: 40, // 최소 높이 설정
  },
  calendarDayText: {
    fontSize: 14,
    color: '#333',
  },
  expiryDay: {
    backgroundColor: '#E0F2F7', // 파란색 계열
    borderWidth: 1,
    borderColor: '#2196F3',
  },
  expiryDayText: {
    color: '#2196F3',
    fontWeight: 'bold',
  },
  endDay: {
    backgroundColor: '#E8F5E9', // 녹색 계열
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  endDayText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  todayDay: {
    backgroundColor: 'transparent', // 배경색 투명하게 변경
    borderWidth: 2,
    borderColor: '#FF5722', // 주황색 테두리
    borderRadius: 10,
    zIndex: 3, // 가장 위에 표시
  },
  todayDayText: {
    color: '#FF5722', // 주황색
    fontWeight: 'bold',
    fontSize: 16, // 글자 크기 키움
    zIndex: 4, // 텍스트가 가장 위에 표시되도록
  },
  expiryDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#2196F3',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  endDot: {
    position: 'absolute',
    bottom: 2,
    right: 12, // 유통기한 점과 겹치지 않도록 위치 조정
    backgroundColor: '#4CAF50',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  customDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  todayHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FF5722', // 오늘 날짜 표시 색상
    borderRadius: 10,
    opacity: 0.15, // 투명도 낮춤
    zIndex: 1, // 다른 요소들 위에 표시
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
    marginBottom: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  todayDot: {
    backgroundColor: '#B0B0B0',
  },
  expiryLegendDot: {
    backgroundColor: '#2196F3',
  },
  endLegendDot: {
    backgroundColor: '#4CAF50',
  },
  legendText: {
    fontSize: 12,
    color: '#666',
  },
  legendLine: {
    width: 20, // 범례 라인의 길이
    height: 10, // 범례 라인의 높이
    borderWidth: 2, // 범례 라인의 테두리 두께
    borderTopWidth: 2,
    borderBottomWidth: 2,
    marginRight: 5,
    borderRadius: 3,
  },
  todayIndicator: {
    backgroundColor: '#FF5722',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: 'center',
    marginTop: 10,
  },
  todayIndicatorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default CalendarView;