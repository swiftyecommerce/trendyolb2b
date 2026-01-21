import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type UserType = 'persistent' | 'session';

export interface User {
    username: string;
    type: UserType;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, type: UserType) => void;
    logout: () => void;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    // Check for existing session in localStorage on mount
    useEffect(() => {
        const storedUser = localStorage.getItem('ty_auth_user');
        if (storedUser) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (e) {
                console.error('Failed to parse stored user', e);
                localStorage.removeItem('ty_auth_user');
            }
        }
    }, []);

    const login = (username: string, type: UserType) => {
        const newUser: User = { username, type };
        setUser(newUser);
        // Persist session to localStorage so refresh doesn't log out
        localStorage.setItem('ty_auth_user', JSON.stringify(newUser));
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('ty_auth_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
