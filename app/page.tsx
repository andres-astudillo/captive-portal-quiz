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
  const [step, setStep] = useState<'form' | 'quiz' | 'result'>('form');
  const [loading, setLoading] = useState(false);

  // Datos del usuario
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');

  // Parámetros que manda Omada en la URL
  const [omadaParams, setOmadaParams] = useState<{
    mac: string;
    ap: string;
    ssid: string;
    t: string;
    loginUrl: string;
    redirectUrl: string;
  }>({
    mac: 'AA:BB:CC:DD:EE:FF',
    ap: '',
    ssid: '',
    t: '',
    loginUrl: '',
    redirectUrl: '',
  });

  // Quiz
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ questionId: string; selectedAnswer: number }[]>([]);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; correctIndex: number; explanation: string } | null>(null);

  // Resultado
  const [result, setResult] = useState<{
    passed: boolean;
    correctAnswers: number;
    totalQuestions: number;
    message: string;
  } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setOmadaParams({
      mac: params.get('mac') || 'AA:BB:CC:DD:EE:FF',
      ap: params.get('ap') || '',
      ssid: params.get('ssid') || '',
      t: params.get('t') || String(Date.now()),
      loginUrl: params.get('loginUrl') || '',
      redirectUrl: params.get('url') || '',
    });
  }, []);

  useEffect(() => {
    if (!result?.passed) return;
    setCountdown(10);
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [result?.passed]);

  useEffect(() => {
    if (countdown === 0) grantOmadaAccess(omadaParams);
  }, [countdown]);

  // Redirigir al controlador Omada para que otorgue acceso
  const grantOmadaAccess = (params: typeof omadaParams) => {
    if (!params.loginUrl) return;
    const authUrl = new URL(params.loginUrl);
    authUrl.searchParams.set('mac', params.mac);
    authUrl.searchParams.set('ap', params.ap);
    authUrl.searchParams.set('ssid', params.ssid);
    authUrl.searchParams.set('t', params.t);
    window.location.href = authUrl.toString();
  };

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/questions?count=5');
      const data = await response.json();
      setQuestions(data);
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
    if (feedback) return; // ya respondida
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

    const newAnswers = [
      ...answers,
      {
        questionId: questions[currentQuestion].id,
        selectedAnswer: selectedOption,
      },
    ];

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
    try {
      setLoading(true);

      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mac: omadaParams.mac,
          name,
          email,
          phone,
          answers: finalAnswers,
        }),
      });

      const data = await response.json();
      setResult(data);
      setStep('result');
      setLoading(false);
    } catch (error) {
      console.error('Error al enviar quiz:', error);
      setLoading(false);
    }
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
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b-4 border-primary p-8 text-center">
          <div className="flex justify-center mb-3">
            <img src="/logo.svg" alt="Alameda" className="h-20 object-contain" />
          </div>
          <p className="text-primary font-semibold tracking-widest text-sm uppercase">WiFi Gratuito</p>
        </div>

        {/* Form Step */}
        {step === 'form' && (
          <div className="p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Bienvenido</h2>
            <p className="text-gray-600 mb-6 text-center">
              Completá tus datos y respondé correctamente al menos{' '}
              <strong>3 de 5 preguntas</strong> para acceder a Internet
            </p>

            <form onSubmit={handleSubmitForm} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre completo *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="Juan Pérez"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="juan@ejemplo.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                  placeholder="+54 261 123 4567"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Continuar al Questionario
              </button>
            </form>
          </div>
        )}

        {/* Quiz Step */}
        {step === 'quiz' && !loading && questions.length > 0 && (
          <div className="p-8">
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-600">
                  Pregunta {currentQuestion + 1} de {questions.length}
                </span>
                <span className="text-sm font-medium text-primary">
                  {questions[currentQuestion].category}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
                />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {questions[currentQuestion].question}
            </h2>

            <div className="space-y-3">
              {questions[currentQuestion].options.map((option, index) => {
                let style = 'border-gray-200 hover:border-gray-300 text-gray-800';
                let dotStyle = 'border-gray-300';
                let dotFill = null;

                if (feedback) {
                  if (index === feedback.correctIndex) {
                    style = 'border-green-500 bg-green-50 text-green-900';
                    dotStyle = 'border-green-500 bg-green-500';
                    dotFill = <div className="w-2 h-2 bg-white rounded-full" />;
                  } else if (index === selectedOption && !feedback.correct) {
                    style = 'border-red-400 bg-red-50 text-red-900';
                    dotStyle = 'border-red-400 bg-red-400';
                    dotFill = <div className="w-2 h-2 bg-white rounded-full" />;
                  } else {
                    style = 'border-gray-200 text-gray-400 opacity-60';
                  }
                } else if (selectedOption === index) {
                  style = 'border-primary bg-primary bg-opacity-10 text-gray-800';
                  dotStyle = 'border-primary bg-primary';
                  dotFill = <div className="w-2 h-2 bg-white rounded-full" />;
                }

                return (
                  <button
                    key={index}
                    onClick={() => handleSelectOption(index)}
                    disabled={!!feedback}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ${style}`}
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

            {/* Feedback box */}
            {feedback && (
              <div className={`mt-4 p-4 rounded-lg border-l-4 ${feedback.correct
                  ? 'bg-green-50 border-green-500'
                  : 'bg-red-50 border-red-400'
                }`}>
                <p className={`font-semibold mb-1 ${feedback.correct ? 'text-green-800' : 'text-red-700'}`}>
                  {feedback.correct ? '✓ ¡Correcto!' : '✗ Incorrecto'}
                </p>
                {feedback.explanation && (
                  <p className="text-sm text-gray-700">{feedback.explanation}</p>
                )}
              </div>
            )}

            <button
              onClick={handleNextQuestion}
              disabled={!feedback}
              className={`w-full mt-6 font-semibold py-3 px-6 rounded-lg transition-colors duration-200 ${!feedback
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-primary hover:bg-primary-dark text-white'
                }`}
            >
              {currentQuestion < questions.length - 1 ? 'Siguiente Pregunta' : 'Ver Resultado'}
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="p-8 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-primary mb-4" size={48} />
            <p className="text-gray-600">Procesando...</p>
          </div>
        )}

        {/* Result Step */}
        {step === 'result' && result && (
          <div className="p-8">
            <div className="text-center mb-6">
              {result.passed ? (
                <div className="flex justify-center mb-4">
                  <CheckCircle className="text-green-500" size={80} />
                </div>
              ) : (
                <div className="flex justify-center mb-4">
                  <XCircle className="text-red-500" size={80} />
                </div>
              )}

              <h2 className={`text-3xl font-bold mb-2 ${result.passed ? 'text-green-600' : 'text-red-600'}`}>
                {result.passed ? '¡Felicitaciones!' : 'Intentá nuevamente'}
              </h2>

              <p className="text-gray-700 text-lg mb-4">{result.message}</p>

              <div className="bg-gray-100 rounded-lg p-4 inline-block">
                <p className="text-2xl font-bold text-gray-800">
                  {result.correctAnswers} / {result.totalQuestions}
                </p>
                <p className="text-sm text-gray-600">Respuestas correctas</p>
              </div>
            </div>

            {!result.passed && (
              <button
                onClick={resetQuiz}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                Intentar Nuevamente
              </button>
            )}

            {result.passed && (
              <div className="mt-6 space-y-4">
                {/* Countdown */}
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-green-800 font-semibold">¡Acceso concedido!</p>
                  {countdown !== null && countdown > 0 ? (
                    <p className="text-green-700 text-sm mt-1">
                      Conectando en{' '}
                      <span className="font-bold text-lg text-green-800">{countdown}</span>
                      {' '}segundos…
                    </p>
                  ) : (
                    <p className="text-green-700 text-sm mt-1">Conectando…</p>
                  )}
                  {omadaParams.loginUrl && (
                    <button
                      onClick={() => grantOmadaAccess(omadaParams)}
                      className="mt-2 text-xs underline text-green-600"
                    >
                      Conectar ahora
                    </button>
                  )}
                </div>

                {/* Invitación a redes */}
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
                  <p className="text-center text-sm text-gray-700 mb-4 leading-relaxed">
                    Mientras esperás, ¡te invitamos a conocernos más!<br />
                    Visitá nuestro sitio, seguinos en las redes o unite a{' '}
                    <span className="font-semibold text-primary">Conectar Alameda</span>.
                  </p>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Web */}
                    <a href="https://alameda.ar" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white border border-primary/30 rounded-lg px-3 py-2 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 group">
                      <svg className="w-5 h-5 text-primary group-hover:text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                      </svg>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-white">alameda.ar</span>
                    </a>

                    {/* Instagram */}
                    <a href="https://www.instagram.com/iglesialameda/" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white border border-primary/30 rounded-lg px-3 py-2 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 group">
                      <svg className="w-5 h-5 text-primary group-hover:text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                        <circle cx="12" cy="12" r="4"/>
                        <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
                      </svg>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-white">Instagram</span>
                    </a>

                    {/* Facebook */}
                    <a href="https://www.facebook.com/IglesiaAlameda" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white border border-primary/30 rounded-lg px-3 py-2 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 group">
                      <svg className="w-5 h-5 text-primary group-hover:text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                      </svg>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-white">Facebook</span>
                    </a>

                    {/* YouTube */}
                    <a href="https://www.youtube.com/@IglesiaAlameda" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-white border border-primary/30 rounded-lg px-3 py-2 hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 group">
                      <svg className="w-5 h-5 text-primary group-hover:text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                        <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
                      </svg>
                      <span className="text-sm font-medium text-gray-700 group-hover:text-white">YouTube</span>
                    </a>

                    {/* WhatsApp - Conectar Alameda - ocupa columna completa */}
                    <a href="https://whatsapp.com/channel/0029VaCf2Ve4o7qM38akeZ2R" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 bg-primary border border-primary rounded-lg px-3 py-2 hover:bg-primary-dark transition-all duration-200 col-span-2 justify-center animate-pulse hover:animate-none">
                      <svg className="w-5 h-5 text-white flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                      </svg>
                      <span className="text-sm font-semibold text-white">Unite a Conectar Alameda</span>
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="bg-[#F5F3EF] px-6 pt-5 pb-4 border-t border-gray-200">
          {/* Redes sociales */}
          <div className="flex justify-center items-center gap-5 mb-4 flex-wrap">
            {/* Web */}
            <a href="https://alameda.ar" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors group">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="10"/>
                <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
              <span className="text-xs">Web</span>
            </a>

            {/* Instagram */}
            <a href="https://www.instagram.com/iglesialameda/" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors group">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.8" fill="currentColor" stroke="none"/>
              </svg>
              <span className="text-xs">Instagram</span>
            </a>

            {/* Facebook */}
            <a href="https://www.facebook.com/IglesiaAlameda" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors group">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
              </svg>
              <span className="text-xs">Facebook</span>
            </a>

            {/* YouTube */}
            <a href="https://www.youtube.com/@IglesiaAlameda" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors group">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.96C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.96A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/>
                <polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/>
              </svg>
              <span className="text-xs">YouTube</span>
            </a>

            {/* WhatsApp */}
            <a href="https://whatsapp.com/channel/0029VaCf2Ve4o7qM38akeZ2R" target="_blank" rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 text-gray-400 hover:text-primary transition-colors group">
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              <span className="text-xs">WhatsApp</span>
            </a>
          </div>

          <p className="text-center text-xs text-gray-400">
            Al conectarte, aceptás nuestros términos y condiciones
          </p>
        </div>
      </div>
    </div>
  );
}
