import React, { createContext, useContext, useState, useEffect } from 'react';

// 创建主题上下文
const ThemeContext = createContext();

// 自定义Hook，方便组件使用主题上下文
export const useTheme = () => useContext(ThemeContext);

// 主题提供者组件
export const ThemeProvider = ({ children }) => {
  // 从localStorage获取主题模式，如果没有则默认为亮色模式
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    return savedMode ? JSON.parse(savedMode) : false;
  });

  // 切换主题模式的函数
  const toggleDarkMode = () => {
    setDarkMode(prevMode => !prevMode);
  };

  // 当主题模式变化时，保存到localStorage
  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    // 可以在这里添加更多与主题相关的副作用，如修改CSS变量等
  }, [darkMode]);

  // 提供主题上下文值
  const themeContextValue = {
    darkMode,
    toggleDarkMode
  };

  return (
    <ThemeContext.Provider value={themeContextValue}>
      {children}
    </ThemeContext.Provider>
  );
};