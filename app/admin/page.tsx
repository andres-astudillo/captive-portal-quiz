'use client';

import { useState, useEffect } from 'react';
import { Users, HelpCircle, TrendingUp, Download, Plus, Trash2, Edit, LogOut, X, Eye, EyeOff, UserX } from 'lucide-react';

interface UserSession {
  mac: string; name: string; email: string; phone: string;
  connectedAt: string; expiresAt: string; correctAnswers: number; totalAttempts: number;
}

interface Question {
  id: string; question: string; options: string[];
  correctAnswer: number; category: string; explanation?: string;
}

interface Stats {
  totalUsers: number; activeUsers: number;
  averageCorrectAnswers: number; averageAttempts: number;
}

const EMPTY_FORM: Omit<Question, 'id'> = {
  question: '', options: ['', '', '', ''], correctAnswer: 0, category: '', explanation: '',
};

// ── Login ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (token: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        const { token } = await res.json();
        localStorage.setItem('admin_token', token);
        onLogin(token);
      } else {
        setError('Credenciales incorrectas');
      }
    } catch {
      setError('Error de conexión');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.svg" alt="Alameda" className="h-16 object-contain mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900">Administración</h1>
          <p className="text-sm text-gray-500 mt-1">Portal Cautivo — Auditorio Alameda</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              placeholder="admin@email.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'} required value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none pr-12"
                placeholder="••••••"
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50">
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Question Form Modal ──────────────────────────────────────────────────────
function QuestionModal({
  question, token, onSave, onClose,
}: {
  question: Question | null; token: string;
  onSave: () => void; onClose: () => void;
}) {
  const [form, setForm] = useState<Omit<Question, 'id'>>(
    question ? { question: question.question, options: [...question.options], correctAnswer: question.correctAnswer, category: question.category, explanation: question.explanation || '' }
      : { ...EMPTY_FORM, options: ['', '', '', ''] }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const setOption = (i: number, val: string) => {
    const opts = [...form.options];
    opts[i] = val;
    setForm(f => ({ ...f, options: opts }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.options.some(o => !o.trim())) { setError('Completá todas las opciones'); return; }
    setSaving(true);
    try {
      const body = question ? { ...form, id: question.id } : form;
      const res = await fetch('/api/admin/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) { onSave(); onClose(); }
      else setError('Error al guardar');
    } catch { setError('Error de conexión'); }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white z-10">
          <h2 className="text-xl font-bold text-gray-900">
            {question ? 'Editar pregunta' : 'Nueva pregunta'}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Pregunta *</label>
            <textarea required rows={2} value={form.question}
              onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder="¿Cuál es...?"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <input required value={form.category}
              onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none"
              placeholder="Cultura General, Mendoza, Música…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Opciones <span className="text-gray-400">(marcá la correcta)</span>
            </label>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <input type="radio" name="correct" checked={form.correctAnswer === i}
                    onChange={() => setForm(f => ({ ...f, correctAnswer: i }))}
                    className="accent-primary w-4 h-4 flex-shrink-0"
                  />
                  <input value={opt} onChange={e => setOption(i, e.target.value)}
                    className={`flex-1 px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-primary outline-none ${form.correctAnswer === i ? 'border-primary bg-primary/5 font-medium' : 'border-gray-300'}`}
                    placeholder={`Opción ${i + 1}`}
                  />
                  {form.correctAnswer === i && (
                    <span className="text-xs text-primary font-semibold whitespace-nowrap">Correcta</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Explicación <span className="text-gray-400">(se muestra al responder)</span>
            </label>
            <textarea rows={3} value={form.explanation}
              onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary outline-none resize-none"
              placeholder="Dato curioso o contexto sobre la respuesta…"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-semibold disabled:opacity-50">
              {saving ? 'Guardando…' : 'Guardar pregunta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'questions'>('stats');
  const [users, setUsers] = useState<UserSession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showForm, setShowForm] = useState(false);

  const headers = { Authorization: `Bearer ${token}` };

  const load = async (tab: typeof activeTab) => {
    setLoading(true);
    try {
      if (tab === 'stats') {
        const r = await fetch('/api/admin/stats', { headers });
        if (r.status === 401) { onLogout(); return; }
        setStats(await r.json());
      } else if (tab === 'users') {
        const r = await fetch('/api/admin/users', { headers });
        if (r.status === 401) { onLogout(); return; }
        setUsers(await r.json());
      } else {
        const r = await fetch('/api/admin/questions', { headers });
        if (r.status === 401) { onLogout(); return; }
        setQuestions(await r.json());
      }
    } catch { /* noop */ }
    setLoading(false);
  };

  useEffect(() => { load(activeTab); }, [activeTab]);

  const deleteQuestion = async (id: string) => {
    if (!confirm('¿Eliminás esta pregunta?')) return;
    await fetch(`/api/admin/questions/${id}`, { method: 'DELETE', headers });
    load('questions');
  };

  const deleteUser = async (mac: string, name: string) => {
    if (!confirm(`¿Eliminás a ${name}? Perderá el acceso al WiFi.`)) return;
    await fetch(`/api/admin/users?mac=${encodeURIComponent(mac)}`, { method: 'DELETE', headers });
    load('users');
  };

  const deleteAllUsers = async () => {
    if (!confirm('¿Eliminás TODOS los usuarios? Todos perderán el acceso al WiFi.')) return;
    await fetch('/api/admin/users?mac=all', { method: 'DELETE', headers });
    load('users');
  };

  const exportCSV = () => {
    const rows = [
      ['Nombre', 'Email', 'Teléfono', 'MAC', 'Conectado', 'Expira', 'Correctas', 'Intentos'],
      ...users.map(u => [
        u.name, u.email, u.phone, u.mac,
        new Date(u.connectedAt).toLocaleString('es-AR'),
        new Date(u.expiresAt).toLocaleString('es-AR'),
        u.correctAnswers, u.totalAttempts,
      ]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })),
      download: `usuarios-wifi-${new Date().toISOString().split('T')[0]}.csv`,
    });
    a.click();
  };

  const tabClass = (t: string) =>
    `py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === t
      ? 'border-primary text-primary'
      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="text-gray-500 text-sm mt-0.5">Portal Cautivo — Auditorio Alameda</p>
          </div>
          <button onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-red-600 border border-gray-200 hover:border-red-200 rounded-lg transition-colors">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button onClick={() => setActiveTab('stats')} className={tabClass('stats')}>
              <TrendingUp className="inline mr-2" size={18} />Estadísticas
            </button>
            <button onClick={() => setActiveTab('users')} className={tabClass('users')}>
              <Users className="inline mr-2" size={18} />Usuarios
            </button>
            <button onClick={() => setActiveTab('questions')} className={tabClass('questions')}>
              <HelpCircle className="inline mr-2" size={18} />Preguntas
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading && <p className="text-gray-500 text-center py-12">Cargando…</p>}

        {/* Stats */}
        {!loading && activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: 'Total usuarios', value: stats.totalUsers, color: 'text-gray-900' },
              { label: 'Usuarios activos', value: stats.activeUsers, color: 'text-green-600' },
              { label: 'Promedio correctas', value: stats.averageCorrectAnswers.toFixed(1), color: 'text-primary' },
              { label: 'Promedio intentos', value: stats.averageAttempts.toFixed(1), color: 'text-orange-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-white rounded-xl shadow p-6">
                <p className="text-sm text-gray-500">{label}</p>
                <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Users */}
        {!loading && activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-5 border-b flex justify-between items-center gap-3 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-900">Lista de usuarios</h2>
              <div className="flex gap-2">
                <button onClick={exportCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm">
                  <Download size={16} />Exportar CSV
                </button>
                <button onClick={deleteAllUsers}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm">
                  <UserX size={16} />Eliminar todos
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {['Nombre', 'Email', 'Teléfono', 'Conectado', 'Expira', 'Score', ''].map((h, i) => (
                      <th key={i} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Sin usuarios aún</td></tr>
                  )}
                  {users.map((u, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                      <td className="px-6 py-4 text-gray-500">{u.email}</td>
                      <td className="px-6 py-4 text-gray-500">{u.phone}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(u.connectedAt).toLocaleDateString('es-AR')}</td>
                      <td className="px-6 py-4 text-gray-500">{new Date(u.expiresAt).toLocaleDateString('es-AR')}</td>
                      <td className="px-6 py-4 text-gray-500">{u.correctAnswers}/5 ({u.totalAttempts} int.)</td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => deleteUser(u.mac, u.name)}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar usuario"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Questions */}
        {!loading && activeTab === 'questions' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                Banco de preguntas <span className="text-gray-400 font-normal">({questions.length})</span>
              </h2>
              <button onClick={() => { setEditingQuestion(null); setShowForm(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm font-medium">
                <Plus size={18} />Nueva pregunta
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {questions.map(q => (
                <div key={q.id} className="bg-white rounded-xl shadow p-5">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                      <span className="inline-block px-2.5 py-0.5 text-xs font-semibold text-primary bg-primary/10 rounded-full mb-2">
                        {q.category}
                      </span>
                      <p className="font-semibold text-gray-900 mb-3">{q.question}</p>
                      <div className="space-y-1">
                        {q.options.map((opt, idx) => (
                          <div key={idx} className={`flex items-center gap-2 text-sm ${idx === q.correctAnswer ? 'text-green-700 font-medium' : 'text-gray-500'}`}>
                            <span>{idx === q.correctAnswer ? '✓' : '○'}</span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                      {q.explanation && (
                        <p className="mt-3 text-xs text-gray-400 italic line-clamp-2">{q.explanation}</p>
                      )}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => { setEditingQuestion(q); setShowForm(true); }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit size={18} />
                      </button>
                      <button onClick={() => deleteQuestion(q.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <QuestionModal
          question={editingQuestion}
          token={token}
          onSave={() => load('questions')}
          onClose={() => { setShowForm(false); setEditingQuestion(null); }}
        />
      )}
    </div>
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setToken(localStorage.getItem('admin_token'));
    setReady(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    setToken(null);
  };

  if (!ready) return null;
  if (!token) return <LoginScreen onLogin={setToken} />;
  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
