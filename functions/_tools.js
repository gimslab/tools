/**
 * GimsLab Tools Registry
 * 새 도구(웹 앱)를 추가할 때는 이 객체에 라우트 키와 타겟 오리진만 등록하면 됩니다.
 */
export const TOOLS = {
  tickten: {
    name: 'TickTen',
    description: '운동 / 스트레칭 인터벌 비프 타이머',
    targetOrigin: 'https://tickten.pages.dev',
    category: 'Fitness / Utilities',
    icon: '⏱️',
    tags: ['Vite', 'React', 'Audio', 'Timer'],
    github: 'https://github.com/gimslab/tickten',
  },
  // 예시: 향후 추가될 도구 슬롯
  // 'tool2': {
  //   name: 'Tool Two',
  //   description: '새로운 유틸리티 도구',
  //   targetOrigin: 'https://tool2.pages.dev',
  //   category: 'Productivity',
  //   icon: '🛠️',
  //   tags: ['Tool'],
  // }
};
