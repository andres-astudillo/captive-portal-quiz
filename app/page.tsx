'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
  explanation?: string;
}

export default function CaptivePortal() {
  const [loaderVisible, setLoaderVisible] = useState(true);
  const [showLoader, setShowLoader] = useState(true);
  const [step, setStep] = useState<'form' | 'quiz' | 'result'>('form');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  const [omadaParams, setOmadaParams] = useState<{
    mac: string; ap: string; ssid: string; t: string;
    site: string; clientIp: string; radioId: string;
    loginUrl: string; redirectUrl: string;
  }>({
    mac: '', ap: '', ssid: '', t: '', site: '',
    clientIp: '', radioId: '', loginUrl: '', redirectUrl: '',
  });

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedAnswer: number }[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; correctIndex: number; explanation: string } | null>(null);

  const [result, setResult] = useState<{
    passed: boolean; correctAnswers: number;
    totalQuestions: number; message: string;
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setLoaderVisible(false), 1200);
    const hideTimer = setTimeout(() => setShowLoader(false), 1900);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOmadaParams({
      mac: params.get('clientMac') || params.get('mac') || '',
      ap: params.get('apMac') || params.get('ap') || '',
      ssid: params.get('ssidName') || params.get('ssid') || '',
      t: params.get('t') || String(Date.now()),
      site: params.get('site') || '',
      clientIp: params.get('clientIp') || '',
      radioId: params.get('radioId') || '',
      loginUrl: params.get('loginUrl') || '',
      redirectUrl: params.get('redirectUrl') || params.get('url') || '',
    });
  }, []);

  useEffect(() => {
    if (!result?.passed) return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [result?.passed]);

  useEffect(() => {
    if (countdown === 0) grantOmadaAccess(omadaParams);
  }, [countdown]);

  const grantOmadaAccess = (params: typeof omadaParams) => {
    let baseUrl: string;
    if (params.loginUrl) {
      baseUrl = params.loginUrl;
    } else if (params.clientIp) {
      const parts = params.clientIp.split('.');
      parts[3] = '1';
      baseUrl = `http://${parts.join('.')}:8088/portal/auth`;
    } else {
      if (params.redirectUrl) window.location.href = params.redirectUrl;
      return;
    }
    const authUrl = new URL(baseUrl);
    authUrl.searchParams.set('t', params.t);
    authUrl.searchParams.set('clientMac', params.mac);
    authUrl.searchParams.set('ap', params.ap);
    authUrl.searchParams.set('ssid', params.ssid);
    authUrl.searchParams.set('site', params.site);
    authUrl.searchParams.set('radioId', params.radioId);
    authUrl.searchParams.set('redirectUrl', params.redirectUrl);
    window.location.href = authUrl.toString();
  };

  const shuffleOptions = (question: Question): Question => {
    const correctText = question.options[question.correctAnswer];
    const shuffled = [...question.options].sort(() => Math.random() - 0.5);
    return { ...question, options: shuffled, correctAnswer: shuffled.indexOf(correctText) };
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/questions?count=5');
      const data: Question[] = await response.json();
      setQuestions(data.map(shuffleOptions));
      setLoading(false);
    } catch (error) {
      console.error('Error al cargar preguntas:', error);
      setLoading(false);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    loadQuestions();
    setStep('quiz');
  };

  const handleSelectOption = (optionIndex: number) => {
    if (feedback) return;
    const q = questions[currentQuestion];
    setSelectedOption(optionIndex);
    setFeedback({
      correct: optionIndex === q.correctAnswer,
      correctIndex: q.correctAnswer,
      explanation: q.explanation || '',
    });
  };

  const handleNextQuestion = () => {
    if (selectedOption === null || !feedback) return;
    const newAnswers = [...answers, { questionId: questions[currentQuestion].id, selectedAnswer: selectedOption }];
    setAnswers(newAnswers);
    setSelectedOption(null);
    setFeedback(null);
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      submitQuiz(newAnswers);
    }
  };

  const submitQuiz = async (finalAnswers: typeof answers) => {
    setLoading(true);
    const localCorrect = finalAnswers.filter(a => {
      const q = questions.find(q2 => q2.id === a.questionId);
      return q !== undefined && q.correctAnswer === a.selectedAnswer;
    }).length;
    const localPassed = localCorrect >= 3;
    let resultData = {
      passed: localPassed, correctAnswers: localCorrect, totalQuestions: finalAnswers.length,
      message: localPassed
        ? '¡Respondiste correctamente! Ya podés navegar.'
        : `Necesitás al menos 3 respuestas correctas. Obtuviste ${localCorrect}.`,
    };
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000);
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac: omadaParams.mac, name, email, phone,
          answers: finalAnswers,
          apMac: omadaParams.ap, ssidName: omadaParams.ssid,
          radioId: omadaParams.radioId, site: omadaParams.site,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await response.json();
      if (data.passed !== undefined) resultData = data;
    } catch {
      console.error('Submit API timeout/error, usando puntaje local');
    }
    setResult(resultData);
    setStep('result');
    setLoading(false);
  };

  const resetQuiz = () => {
    setStep('form');
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedOption(null);
    setFeedback(null);
    setResult(null);
    setCountdown(null);
    setName('');
    setEmail('');
    setPhone('');
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Loader overlay */}
      {showLoader && (
        <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-[#0c1829] via-[#0f2d52] to-[#1a4a7a] transition-opacity duration-700 pointer-events-none ${loaderVisible ? 'opacity-100' : 'opacity-0'}`}>
          <img src="/logo.svg" alt="Alameda" className="h-28 object-contain mb-10 brightness-0 invert" />
          <div className="flex gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '0ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '160ms' }} />
            <span className="w-2.5 h-2.5 rounded-full bg-white/70 animate-bounce" style={{ animationDelay: '320ms' }} />
          </div>
        </div>
      )}

      {/* Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-[#0c1829] via-[#0f2d52] to-[#1a4a7a]" />
      <div className="fixed top-[-15%] left-[-10%] w-96 h-96 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-15%] right-[-10%] w-[30rem] h-[30rem] rounded-full bg-indigo-500/10 blur-3xl pointer-events-none" />
      <div className="fixed top-[40%] right-[-5%] w-64 h-64 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-white/[0.07] backdrop-blur-2xl border border-white/15 rounded-3xl overflow-hidden shadow-2xl">

          {/* Header */}
          <div className="p-8 text-center border-b border-white/10">
            <div className="flex justify-center mb-3">
              <img src="/logo.svg" alt="Alameda" className="h-20 object-contain brightness-0 invert" />
            </div>
            <p className="text-white/50 font-semibold tracking-widest text-sm uppercase">WiFi Gratuito</p>
          </div>

          {/* Form Step */}
          {step === 'form' && (
            <div className="p-8">
              <h2 className="text-2xl font-bold text-white mb-2 text-center">Bienvenido</h2>
              <p className="text-white/60 mb-6 text-center">
                Completá tus datos y respondé correctamente al menos{' '}
                <strong className="text-white/90">3 de 5 preguntas</strong> para acceder a Internet
              </p>
              <form onSubmit={handleSubmitForm} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Nombre completo *</label>
                  <input
                    type="text" required value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-all"
                    placeholder="Juan Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Email *</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-all"
                    placeholder="juan@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Teléfono *</label>
                  <input
                    type="tel" required value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-white/40 focus:ring-2 focus:ring-white/10 transition-all"
                    placeholder="+54 261 123 4567"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-white text-[#0f2d52] font-semibold py-3 px-6 rounded-xl hover:bg-white/90 transition-all duration-200"
                >
                  Continuar al Cuestionario
                </button>
              </form>
            </div>
          )}

          {/* Quiz Step */}
          {step === 'quiz' && !loading && questions.length > 0 && (
            <div className="p-8">
              <div className="mb-6">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-white/50">
                    Pregunta {currentQuestion + 1} de {questions.length}
                  </span>
                  <span className="text-sm font-medium text-white/70 bg-white/10 px-3 py-1 rounded-full">
                    {questions[currentQuestion].category}
                  </span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  <div
                    className="bg-white h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                  />
                </div>
              </div>

              <h2 className="text-xl font-bold text-white mb-6 leading-snug">
                {questions[currentQuestion].question}
              </h2>

              <div className="space-y-3">
                {questions[currentQuestion].options.map((option, index) => {
                  let style = 'bg-white/5 border-white/15 text-white/85 hover:bg-white/10 hover:border-white/30';
                  let dotStyle = 'border-white/30';
                  let dotFill = null;

                  if (feedback) {
                    if (index === feedback.correctIndex) {
                      style = 'bg-green-500/20 border-green-400/70 text-green-100';
                      dotStyle = 'border-green-400 bg-green-400';
                      dotFill = <div className="w-2 h-2 bg-white rounded-full" />;
                    } else if (index === selectedOption && !feedback.correct) {
                      style = 'bg-red-500/20 border-red-400/70 text-red-100';
                      dotStyle = 'border-red-400 bg-red-400';
                      dotFill = <div className="w-2 h-2 bg-white rounded-full" />;
                    } else {
                      style = 'bg-white/[0.03] border-white/10 text-white/30';
                    }
                  } else if (selectedOption === index) {
                    style = 'bg-white/15 border-white/40 text-white';
                    dotStyle = 'border-white bg-white';
                    dotFill = <div className="w-2 h-2 bg-[#0f2d52] rounded-full" />;
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectOption(index)}
                      disabled={!!feedback}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${style}`}
                    >
                      <div className="flex items-center">
                        <div className={`w-6 h-6 rounded-full border-2 mr-3 flex items-center justify-center flex-shrink-0 ${dotStyle}`}>
                          {dotFill}
                        </div>
                        <span>{option}</span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {feedback && (
                <div className={`mt-4 p-4 rounded-xl border-l-4 ${feedback.correct
                  ? 'bg-green-500/10 border-green-400'
                  : 'bg-red-500/10 border-red-400'
                }`}>
                  <p className={`font-semibold mb-1 ${feedback.correct ? 'text-green-300' : 'text-red-300'}`}>
                    {feedback.correct ? '✓ ¡Correcto!' : '✗ Incorrecto'}
                  </p>
                  {feedback.explanation && (
                    <p className="text-sm text-white/60">{feedback.explanation}</p>
                  )}
                </div>
              )}

              <button
                onClick={handleNextQuestion}
                disabled={!feedback}
                className={`w-full mt-6 font-semibold py-3 px-6 rounded-xl transition-all duration-200 ${
                  !feedback
                    ? 'bg-white/10 text-white/30 cursor-not-allowed'
                    : 'bg-white text-[#0f2d52] hover:bg-white/90'
                }`}
              >
                {currentQuestion < questions.length - 1 ? 'Siguiente Pregunta' : 'Ver Resultado'}
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="p-8 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-white/60 mb-4" size={48} />
              <p className="text-white/50">Procesando...</p>
            </div>
          )}

          {/* Result Step */}
          {step === 'result' && result && (
            <div className="p-8">
              <div className="text-center mb-6">
                {result.passed ? (
                  <div className="flex justify-center mb-4">
                    <CheckCircle className="text-green-400" size={80} />
                  </div>
                ) : (
                  <div className="flex justify-center mb-4">
                    <XCircle className="text-red-400" size={80} />
                  </div>
                )}
                <h2 className={`text-3xl font-bold mb-2 ${result.passed ? 'text-green-300' : 'text-red-300'}`}>
                  {result.passed ? '¡Felicitaciones!' : 'Intentá nuevamente'}
                </h2>
                <p className="text-white/70 text-lg mb-4">{result.message}</p>
                <div className="bg-white/10 border border-white/15 rounded-2xl p-4 inline-block">
                  <p className="text-2xl font-bold text-white">
                    {result.correctAnswers} / {result.totalQuestions}
                  </p>
                  <p className="text-sm text-white/50">Respuestas correctas</p>
                </div>
              </div>

              {!result.passed && (
                <button
                  onClick={resetQuiz}
                  className="w-full bg-white text-[#0f2d52] font-semibold py-3 px-6 rounded-xl hover:bg-white/90 transition-all duration-200"
                >
                  Intentar Nuevamente
                </button>
              )}

              {result.passed && (
                <div className="mt-6 space-y-4">
                  <div className="bg-green-500/15 border border-green-400/30 rounded-2xl p-4 text-center">
                    <p className="text-green-300 font-semibold">¡Acceso concedido!</p>
                    {countdown !== null && countdown > 0 ? (
                      <p className="text-green-400/80 text-sm mt-1">
                        Conectando en{' '}
                        <span className="font-bold text-lg text-green-300">{countdown}</span>
                        {' '}segundos…
                      </p>
                    ) : (
                      <p className="text-green-400/80 text-sm mt-1">Conectando…</p>
                    )}
                    {omadaParams.loginUrl && (
                      <button
                        onClick={() => grantOmadaAccess(omadaParams)}
                        className="mt-2 text-xs underline text-green-400/70"
                      >
                        Conectar ahora
                      </button>
                    )}
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                    <p className="text-center text-sm text-white/60 mb-4 leading-relaxed">
                      Mientras esperás, ¡te invitamos a conocernos más!<br />
                      Visitá nuestro sitio, seguinos en las redes o unite a{' '}
                      <span className="font-semibold text-white/90">Conectar Alameda</span>.
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <a href="https://alameda.ar" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2 hover:bg-white/15 hover:border-white/30 transition-all duration-200 group">
                        <svg className="w-5 h-5 text-white/60 group-hover:text-white flex-shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <circle cx="12" cy="12" r="10"/>
                          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                        </svg>
                        <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">alameda.ar</span>
                      </a>
                      <a href="https://www.instagram.com/iglesialameda/" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2 hover:bg-white/15 hover:border-white/30 transition-all duration-200 group">
                        <svg className="w-5 h-5 text-white/60 group-hover:text-white flex-shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                          <circle cx="12" cy="12" r="4"/>
                          <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                        </svg>
                        <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Instagram</span>
                      </a>
                      <a href="https://www.facebook.com/IglesiaAlameda" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2 hover:bg-white/15 hover:border-white/30 transition-all duration-200 group">
                        <svg className="w-5 h-5 text-white/60 group-hover:text-white flex-shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                        </svg>
                        <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">Facebook</span>
                      </a>
                      <a href="https://www.youtube.com/@IglesiaAlameda" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-white/5 border border-white/15 rounded-xl px-3 py-2 hover:bg-white/15 hover:border-white/30 transition-all duration-200 group">
                        <svg className="w-5 h-5 text-white/60 group-hover:text-white flex-shrink-0 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                          <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
                        </svg>
                        <span className="text-sm font-medium text-white/70 group-hover:text-white transition-colors">YouTube</span>
                      </a>
                      <a href="https://whatsapp.com/channel/0029VaCf2Ve4o7qM38akeZ2R" target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 bg-green-500/20 border border-green-400/30 rounded-xl px-3 py-2 hover:bg-green-500/30 transition-all duration-200 col-span-2 justify-center animate-pulse hover:animate-none">
                        <svg className="w-5 h-5 text-green-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                        </svg>
                        <span className="text-sm font-semibold text-green-300">Unite a Conectar Alameda</span>
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 pt-5 pb-4 border-t border-white/10">
            <div className="flex justify-center items-center gap-5 mb-4 flex-wrap">
              <a href="https://alameda.ar" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 text-white/30 hover:text-white/70 transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <span className="text-xs">Web</span>
              </a>
              <a href="https://www.instagram.com/iglesialameda/" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 text-white/30 hover:text-white/70 transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <circle cx="12" cy="12" r="4"/>
                  <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                </svg>
                <span className="text-xs">Instagram</span>
              </a>
              <a href="https://www.facebook.com/IglesiaAlameda" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 text-white/30 hover:text-white/70 transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                </svg>
                <span className="text-xs">Facebook</span>
              </a>
              <a href="https://www.youtube.com/@IglesiaAlameda" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 text-white/30 hover:text-white/70 transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                  <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
                </svg>
                <span className="text-xs">YouTube</span>
              </a>
              <a href="https://whatsapp.com/channel/0029VaCf2Ve4o7qM38akeZ2R" target="_blank" rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 text-white/30 hover:text-white/70 transition-colors">
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                </svg>
                <span className="text-xs">WhatsApp</span>
              </a>
            </div>
            <p className="text-center text-xs text-white/25">
              Al conectarte, aceptás nuestros términos y condiciones
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
