// src/global.js
import { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  body {
    background: ${({ theme }) => theme.body};
    color: ${({ theme }) => theme.text};
    font-family: Tahoma, Helvetica, Arial, Roboto, sans-serif;
    transition: all 0.50s linear;
  }
  .chat-app {
    display: flex;
    flex-direction: column;
    height: 100vh;
    justify-content: space-between;
    background: ${({ theme }) => theme.background};
    color: ${({ theme }) => theme.text};
  }
  .chat-window {
    flex-grow: 1;
    padding: 1rem;
    overflow-y: auto;
  }
  .chat-input {
    display: flex;
    padding: 1rem;
    background: ${({ theme }) => theme.body};
  }
  .message {
    margin: 0.5rem 0;
    padding: 0.5rem 1rem;
    border-radius: 1rem;
  }
  .message.user {
    background-color: #4CAF50;
    color: white;
    align-self: flex-end;
  }
  .message.bot {
    background-color: #e0e0e0;
    align-self: flex-start;
  }
  .typing-indicator {
    color: #666;
    font-style: italic;
    margin: 0.5rem;
  }
`;
