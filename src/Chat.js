import React, { useState, useEffect, useRef } from 'react';
import { InputTextarea } from 'primereact/inputtextarea';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { FiSend } from 'react-icons/fi';
import { AiOutlinePaperClip, AiOutlineCopy } from 'react-icons/ai';
import { FaMicrophone } from 'react-icons/fa';
import axios from 'axios';
import "./App.css";
import "./Chat.css"

const Chat = () => {
    const [messages, setMessages] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const chatEndRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const silenceDetectionRef = useRef(null);
    const inputRef = useRef(null);
    const MIN_DECIBELS = -45;
    const SILENCE_THRESHOLD_MS = 2000; // 1 second of silence

    useEffect(() => {
        if (chatEndRef.current) {
            chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages]);
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);
    const toggleRecording = () => {
        if (isRecording) {
            stopRecording(); // Stop recording and silence detection
            if (silenceDetectionRef.current) {
                silenceDetectionRef.current.disconnect();
            }
        } else {
            startRecording(); // Start recording and silence detection
        }
    };
    
    useEffect(() => {
        if (audioBlob) {
            sendAudioMessage(); // Automatically send the audio when available
        }
    }, [audioBlob]);
    
    const sendAudioMessage = async () => {
        if (audioBlob) {
            setLoading(true);
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recording.wav');
    
            try {
                const response = await axios.post('https://chat.deepmd.io/audio', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });
    
                const { extracted_text, llama_response, history } = response.data;
    
                const newMessages = [...messages, 
                    { role: 'user', content: ` ${extracted_text}` }, 
                    { role: 'Vuely', content: llama_response }
                ];
                setMessages(newMessages);
            } catch (error) {
                console.error('Error sending audio message:', error);
            } finally {
                setLoading(false);
                setAudioBlob(null);
            }
        }
    };
    
    const detectSilence = (
        stream,
        onSoundEnd = () => {},
        onSoundStart = () => {},
        silence_delay = SILENCE_THRESHOLD_MS,
        min_decibels = MIN_DECIBELS
    ) => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        const streamNode = ctx.createMediaStreamSource(stream);
        streamNode.connect(analyser);
        analyser.minDecibels = min_decibels;

        const data = new Uint8Array(analyser.frequencyBinCount);
        let silence_start = performance.now();
        let triggered = false;

        function loop(time) {
            requestAnimationFrame(loop);
            analyser.getByteFrequencyData(data);
            if (data.some(v => v > 0)) {
                if (triggered) {
                    triggered = false;
                    onSoundStart();
                }
                silence_start = time;
            }
            if (!triggered && time - silence_start > silence_delay) {
                onSoundEnd();
                triggered = true;
            }
        }
        loop();

        silenceDetectionRef.current = analyser;
    };

    function onSilence() {
        console.log('Silence detected');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop(); // Stop recording
             console.log('Audio sent');
        }
    }
    
    function onSpeak() {
        console.log('Speaking detected');
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'recording') {
            startRecording(); // Resume recording
        }
    }
    
    const startRecording = () => {
        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                mediaRecorderRef.current = new MediaRecorder(stream);
                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) {
                        setAudioBlob(event.data); // Save the blob for sending
                    }
                };
                detectSilence(stream, onSilence, onSpeak);
                mediaRecorderRef.current.start(); // Start recording
                setIsRecording(true);
            })
            .catch(err => {
                console.error('Error accessing microphone:', err);
            });
    };
    
    const stopRecording = () => {
        if (mediaRecorderRef.current) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };
     
    const sendMessage = async (message = userInput) => {
        if (message.trim()) {
            const newMessages = [...messages, { role: 'user', content: message }];
            setMessages(newMessages);
            setUserInput('');
            setLoading(true);

            try {
                const response = await axios.post('https://chat.deepmd.io/vuely/chat', {
                    user_input: message,
                    history: newMessages.map(msg => [msg.role, msg.content]),
                    temperature: 0.6,
                    top_p: 0.9,
                    max_gen_len: 512
                });
                console.log('Vuely response:', response.data.history);
                response.data.history.shift();
                setMessages(response.data.history.map(([role, content]) => ({ role, content })));
            } catch (error) {
                console.error('Error sending message:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleInputChange = (e) => {
        setUserInput(e.target.value);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const uploadFile = async () => {
        if (selectedFile) {
            setLoading(true);

            const formData = new FormData();
            formData.append('file', selectedFile);

            try {
                const response = await axios.post('https://chat.deepmd.io/extract-text', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                });

                const extractedText = response.data.extracted_text;
                const newMessages = [...messages, { role: 'user', content: `Uploaded file: ${selectedFile.name}` }, { role: 'Vuely', content: extractedText }];
                setMessages(newMessages);
                setSelectedFile(null);
            } catch (error) {
                console.error('Error uploading file:', error);
            } finally {
                setLoading(false);
            }
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).catch(err => {
            console.error('Failed to copy: ', err);
        });
    };

const formatMessageContent = (content) => {
    const promptRegex = /<begin Prompt>([\s\S]*?)<end Prompt>/;
    const match = content.match(promptRegex);

    if (match) {
        const promptText = match[1].trim();
        const prompts = promptText.split('\n').filter(p => p.trim() !== '');
        return (
            <>
                {content.split(promptRegex)[0]} 
                <div className="prompt-list">
                    {prompts.map((prompt, index) => (
                        <Button 
                            key={index}
                            className="prompt-button"
                            onClick={() => sendMessage(prompt)}
                        >
                            {prompt}
                        </Button>
                    ))}
                </div>
            </>
        );
    }

    return content;
};


    return (
        <div className="col-12 chat-container">
<div  className="top-center">
                        <h1 >Your Personal AI Assistant</h1>
                        
                    </div>
            <div className="chat-messages">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`message ${msg.role}`}>
                        <Card className="message-card">
                            <div className="message-content">
                                {msg.role === 'Vuely' && (
                                    <AiOutlineCopy
                                        className="copy-icon"
                                        onClick={() => copyToClipboard(msg.content)}
                                        title="Copy to clipboard"
                                    />
                                )}
                                <strong>{msg.role === 'user' ? 'You' : 'Vuely'}:</strong>
                                <pre className="formatted-response">{formatMessageContent(msg.content)}</pre>
                            </div>
                        </Card>
                    </div>
                ))}
                {loading && (
                    <div className="loading-indicator">
                        <div className="spinner"></div>
                        <p>Waiting for response...</p>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>
            <div className="chat-footer">
                <input
                    type="file"
                    id="file-upload"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    disabled={loading} // Disable when loading
                />
                <Button
                    icon={<AiOutlinePaperClip />}
                    className="attachment-button"
                    tooltip="Attach a file"
                    tooltipOptions={{ position: 'top' }}
                    onClick={() => document.getElementById('file-upload').click()}
                    disabled={loading} // Disable when loading
                />
                <Button
                    label="Upload"
                    style={{ color: 'white' }}
                    className="p-button-info"
                    onClick={uploadFile}
                    disabled={!selectedFile || loading} // Disable when no file selected or loading
                />
                
                <InputTextarea
                    ref={inputRef} 
                    value={userInput}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    placeholder="Message Vuely"
                    className="message-input"
                    autoResize={false}
                    rows={1}
                    disabled={loading} // Disable when loading
                />
                <Button
                    icon={<FaMicrophone color={isRecording ? 'red' : 'black'} />}
                    className="p-button"
                    onClick={toggleRecording}
                    tooltip={isRecording ? "Stop Recording" : "Start Recording"}
                    tooltipOptions={{ position: 'top' }}
                />
                <Button
                    icon={<FiSend />}
                    className="send-button"
                    onClick={() => {
                        if (audioBlob) {
                            sendAudioMessage(); // Send the recorded audio if available
                        } else if (userInput.trim()) {
                            sendMessage(); // Otherwise, send the text message
                        }
                    }}
                    disabled={loading || (!userInput.trim() && !audioBlob)} // Disable if loading or neither input nor audioBlob is available
                />
            </div>
        </div>
    );
};

export default Chat;
