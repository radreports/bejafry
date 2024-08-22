import React, { useState } from 'react';
import Chat from './Chat';


import { Button } from 'primereact/button';
import { FaMoon, FaSun, FaCog } from 'react-icons/fa';
import './App.css';

function App() {
    const [theme, setTheme] = useState('light');
    const [language, setLanguage] = useState('english');

    const toggleTheme = () => {
        const newTheme = theme === 'light' ? 'dark' : 'light';
        setTheme(newTheme);
        document.body.className = newTheme; // Apply the theme to the body element
    };

    const changeLanguage = (lang) => {
        setLanguage(lang);
        alert(`Language changed to ${lang}`);
    };

    return (
        <div className={`app-container ${theme}`}>
                      <div class="top-center">
                <h1>Beja - Conversational AI</h1>
                
            </div>
            <div className="header">
                <div className="top-right-icons">
                    <Button
                        icon={theme === 'light' ? <FaMoon /> : <FaSun />}
                        onClick={toggleTheme}
                        className="theme-toggle-button"
                        tooltip={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
                    />
                    <Button
                        icon={<FaCog />}
                        className="settings-button"
                        tooltip="Change Language"
                        onClick={() => {
                            const lang = prompt('Select Language: english, telugu, hindi', language);
                            if (lang) changeLanguage(lang);
                        }}
                    />
                </div>
            </div>
            <Chat />
        </div>
    );
}

export default App;
