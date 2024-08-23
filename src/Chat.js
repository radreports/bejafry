import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { FiSend } from 'react-icons/fi';
import { AiOutlinePaperClip } from 'react-icons/ai';
import axios from 'axios';
import './App.css';

function App() {
  const [messages, setMessages] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [prompts, setPrompts] = useState([]);
  const chatEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const silenceDetectionRef = useRef(null);

  const MIN_DECIBELS = -45;
  const SILENCE_THRESHOLD_MS = 2000; // 1 second of silence

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
      if (silenceDetectionRef.current) {
        silenceDetectionRef.current.disconnect();
      }
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    if (audioBlob) {
      sendAudioMessage();
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

        const { extracted_text, llama_response } = response.data;

        const newMessages = [...messages, 
          { role: 'user', content: ` ${extracted_text}` }, 
          { role: 'Beja', content: llama_response }
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
            setAudioBlob(event.data);
          }
        };
        detectSilence(stream, onSilence, onSpeak);
        mediaRecorderRef.current.start();
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

  const sendMessage = async () => {
    if (userInput.trim()) {
      const newMessages = [...messages, { role: 'user', content: userInput }];
      setMessages(newMessages);
      setUserInput('');
      setLoading(true);

      try {
        const response = await axios.post('https://chat.deepmd.io/beja/chat', {
          user_input: userInput,
          history: newMessages.map(msg => [msg.role, msg.content]),
          temperature: 0.6,
          top_p: 0.9,
          max_gen_len: 512
        });
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
        const newMessages = [...messages, { role: 'user', content: `Uploaded file: ${selectedFile.name}` }, { role: 'Beja', content: extractedText }];
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
    const formattedContent = content.split(/(\*\*.*?\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
    return formattedContent;
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Vuely: Your Conversational AI</h1>
      </header>

      <div className="file-upload">
        <input type="file" id="fileUpload" className="file-input" onChange={handleFileChange} />
        <Button label="Upload" onClick={uploadFile} disabled={!selectedFile || loading} />
      </div>

      <div className="prompt-buttons">
        {prompts.map((prompt, index) => (
          <button key={index} className="prompt-button" onClick={() => setUserInput(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="input-area">
        <textarea
          className="user-input"
          placeholder="Your input..."
          value={userInput}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
        ></textarea>
        <div className="action-buttons">
          <Button icon={<AiOutlinePaperClip />} onClick={toggleRecording} className="rtc-button">
            {isRecording ? 'Stop Recording' : 'Start Recording'}
          </Button>
          <Button icon={<FiSend />} onClick={sendMessage} disabled={loading || (!userInput.trim() && !audioBlob)} />
        </div>
      </div>

      <div className="response-area">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <Card className="message-card">
              <div className="message-content">
                <strong>{msg.role === 'user' ? 'You' : 'Beja'}:</strong>
                <pre className="formatted-response">{formatMessageContent(msg.content)}</pre>
              </div>
            </Card>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>
    </div>
  );
}

export default App;
