import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [activeWorkspace, setActiveWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('shikshak_iq_token');
    const savedUser = localStorage.getItem('shikshak_iq_user');
    const savedWorkspace = localStorage.getItem('shikshak_iq_active_workspace');
    if (token && savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        setUser(parsedUser);
        if (parsedUser.workspaces) {
          setWorkspaces(parsedUser.workspaces);
          if (savedWorkspace) {
            try {
              setActiveWorkspace(JSON.parse(savedWorkspace));
            } catch {
              if (parsedUser.workspaces.length > 0) {
                setActiveWorkspace(parsedUser.workspaces[0]);
              }
            }
          } else if (parsedUser.workspaces.length > 0) {
            setActiveWorkspace(parsedUser.workspaces[0]);
          }
        }
      } catch {
        localStorage.removeItem('shikshak_iq_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      setError(null);
      const response = await authAPI.login(email, password);
      const { token, user: userData, workspaces: wsData, school } = response.data;

      const enrichedUser = {
        ...userData,
        workspaces: wsData || [],
        school: school || null,
      };

      localStorage.setItem('shikshak_iq_token', token);
      localStorage.setItem('shikshak_iq_user', JSON.stringify(enrichedUser));
      setUser(enrichedUser);
      setWorkspaces(wsData || []);

      if (wsData && wsData.length > 0) {
        setActiveWorkspace(wsData[0]);
        localStorage.setItem('shikshak_iq_active_workspace', JSON.stringify(wsData[0]));
      }

      return enrichedUser;
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
      throw new Error(msg);
    }
  };

  const logout = () => {
    localStorage.removeItem('shikshak_iq_token');
    localStorage.removeItem('shikshak_iq_user');
    localStorage.removeItem('shikshak_iq_active_workspace');
    setUser(null);
    setWorkspaces([]);
    setActiveWorkspace(null);
  };

  const switchWorkspace = (workspace) => {
    setActiveWorkspace(workspace);
    localStorage.setItem('shikshak_iq_active_workspace', JSON.stringify(workspace));
  };

  const refreshUser = async () => {
    try {
      const response = await authAPI.getMe();
      const { user: userData, workspaces: wsData } = response.data;
      const enrichedUser = {
        ...userData,
        workspaces: wsData || [],
      };
      setUser(enrichedUser);
      setWorkspaces(wsData || []);
      localStorage.setItem('shikshak_iq_user', JSON.stringify(enrichedUser));
    } catch {
      logout();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        activeWorkspace,
        loading,
        error,
        login,
        logout,
        switchWorkspace,
        refreshUser,
        isAuthenticated: !!user,
        isPrincipal: user?.role === 'principal',
        isTeacher: user?.role === 'teacher',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
