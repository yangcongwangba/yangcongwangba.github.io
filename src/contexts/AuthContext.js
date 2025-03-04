import React, { createContext, useContext, useState, useEffect } from 'react';
import { Octokit } from '@octokit/rest';
import axios from 'axios';
import config from '../config';

// 创建认证上下文
const AuthContext = createContext();

// 自定义Hook，方便组件使用认证上下文
export const useAuth = () => useContext(AuthContext);

// 认证提供者组件
export const AuthProvider = ({ children }) => {
  // 用户状态
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [octokit, setOctokit] = useState(null);

  // 从localStorage获取token
  useEffect(() => {
    const token = localStorage.getItem('github_token');
    if (token) {
      loginWithToken(token);
    } else {
      setLoading(false);
    }
  }, []);

  // 使用GitHub Token登录
  const loginWithToken = async (token) => {
    try {
      setLoading(true);
      setError(null);
      
      // 创建Octokit实例
      const oktokitInstance = new Octokit({ auth: token });
      
      // 获取用户信息
      const { data } = await oktokitInstance.users.getAuthenticated();
      
      // 保存用户信息和token
      setUser(data);
      setOctokit(oktokitInstance);
      setIsAuthenticated(true);
      localStorage.setItem('github_token', token);
    } catch (err) {
      console.error('登录失败:', err);
      setError('登录失败，请检查您的Token是否有效');
      localStorage.removeItem('github_token');
    } finally {
      setLoading(false);
    }
  };

  // 使用GitHub OAuth登录
  const loginWithOAuth = () => {
    // 构建GitHub OAuth URL
    const githubOAuthUrl = `https://github.com/login/oauth/authorize?client_id=${config.github.clientId}&redirect_uri=${encodeURIComponent(config.github.redirectUri)}&scope=repo,user`;
    
    // 重定向到GitHub授权页面
    window.location.href = githubOAuthUrl;
  };

  // 处理OAuth回调
  const handleOAuthCallback = async (code) => {
    try {
      setLoading(true);
      setError(null);
      
      // 使用代理服务器或GitHub Actions获取访问令牌
      // 注意：在纯前端应用中，这通常需要一个代理服务器来保护client_secret
      // 这里我们假设有一个代理端点或使用GitHub Actions来处理
      const tokenResponse = await axios.post(config.github.tokenProxyUrl, {
        code,
        client_id: config.github.clientId,
        redirect_uri: config.github.redirectUri
      });
      
      const token = tokenResponse.data.access_token;
      
      // 使用获取的token登录
      await loginWithToken(token);
    } catch (err) {
      console.error('OAuth回调处理失败:', err);
      setError('OAuth登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 登出
  const logout = () => {
    setUser(null);
    setOctokit(null);
    setIsAuthenticated(false);
    localStorage.removeItem('github_token');
  };

  // 提供认证上下文值
  const authContextValue = {
    user,
    isAuthenticated,
    loading,
    error,
    octokit,
    loginWithToken,
    loginWithOAuth,
    handleOAuthCallback,
    logout
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};