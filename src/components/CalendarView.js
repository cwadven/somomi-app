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
 * @param {Object} props.customStyles - 커스텀 스타일 (선택사항)
 * @returns {JSX.Element}
 */
const CalendarView = ({
  currentMonth = new Date(),
  onMonthChange,
  markedDates = [],
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
  
  // 날짜가 마킹된 날짜인지 확인하고 해당 마킹 정보 반환
  const getMarking = (date) => {
    return markedDates.find(marking => 
      marking.date.getFullYear() === date.getFullYear() && 
      marking.date.getMonth() === date.getMonth() && 
      marking.date.getDate() === date.getDate()
    );
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
      const marking = getMarking(date);
      
      const isMarked = !!marking;
      const markingType = marking?.type || '';
      const markingColor = marking?.color;
      
      days.push(
        <View 
          key={`day-${day}`} 
          style={[
            styles.calendarDay,
            isMarked && markingType === 'expiry' && styles.expiryDay,
            isMarked && markingType === 'end' && styles.endDay,
            isTodayDate && styles.todayDay,
            isMarked && markingType === 'custom' && { backgroundColor: `${markingColor}20` },
            isMarked && markingType === 'custom' && { borderColor: markingColor, borderWidth: 1 },
            customStyles.calendarDay
          ]}
        >
          <Text style={[
            styles.calendarDayText,
            isMarked && markingType === 'expiry' && styles.expiryDayText,
            isMarked && markingType === 'end' && styles.endDayText,
            isTodayDate && styles.todayDayText,
            isMarked && markingType === 'custom' && { color: markingColor },
            customStyles.calendarDayText
          ]}>
            {day}
          </Text>
          {isMarked && markingType === 'expiry' && <View style={styles.expiryDot} />}
          {isMarked && markingType === 'end' && <View style={styles.endDot} />}
          {isMarked && markingType === 'custom' && (
            <View style={[styles.customDot, { backgroundColor: markingColor }]} />
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
          <View style={[styles.legendDot, styles.todayDot]} />
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
  },
  calendarDay: {
    width: '14.28%', // 정확히 7일로 나누기 위해 14.28%로 설정
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
    borderRadius: 10,
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
    backgroundColor: '#F0F0F0', // 회색
    borderWidth: 1,
    borderColor: '#B0B0B0',
  },
  todayDayText: {
    color: '#B0B0B0',
    fontWeight: 'bold',
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
    right: 2,
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
});

export default CalendarView; 