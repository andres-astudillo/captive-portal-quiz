'use client';

import { useState, useEffect } from 'react';
import { Users, HelpCircle, TrendingUp, Download, Plus, Trash2, Edit } from 'lucide-react';

interface UserSession {
  mac: string;
  name: string;
  email: string;
  phone: string;
  connectedAt: string;
  expiresAt: string;
  correctAnswers: number;
  totalAttempts: number;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  category: string;
}

interface Stats {
  totalUsers: number;
  activeUsers: number;
  averageCorrectAnswers: number;
  averageAttempts: number;
}

export default function AdminPanel() {
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'questions'>('stats');
  const [users, setUsers] = useState<UserSession[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Estado para edición de preguntas
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  useEffect(() => {
    if (activeTab === 'stats') loadStats();
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'questions') loadQuestions();
  }, [activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
    setLoading(false);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
    setLoading(false);
  };

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/questions');
      const data = await response.json();
      setQuestions(data);
    } catch (error) {
      console.error('Error al cargar preguntas:', error);
    }
    setLoading(false);
  };

  const exportToCSV = () => {
    const headers = ['Nombre', 'Email', 'Teléfono', 'MAC', 'Conectado', 'Expira', 'Respuestas Correctas', 'Intentos'];
    const rows = users.map(u => [
      u.name,
      u.email,
      u.phone,
      u.mac,
      new Date(u.connectedAt).toLocaleString('es-AR'),
      new Date(u.expiresAt).toLocaleString('es-AR'),
      u.correctAnswers,
      u.totalAttempts
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios-wifi-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return;
    
    try {
      await fetch(`/api/admin/questions/${id}`, { method: 'DELETE' });
      loadQuestions();
    } catch (error) {
      console.error('Error al eliminar pregunta:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
          <p className="text-gray-600 mt-1">Portal Cautivo - Auditorio Alameda</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <TrendingUp className="inline mr-2" size={20} />
              Estadísticas
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline mr-2" size={20} />
              Usuarios Conectados
            </button>
            <button
              onClick={() => setActiveTab('questions')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'questions'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <HelpCircle className="inline mr-2" size={20} />
              Gestión de Preguntas
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Tab */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Total Usuarios</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.totalUsers}</p>
                </div>
                <Users className="text-primary" size={40} />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Usuarios Activos</p>
                  <p className="text-3xl font-bold text-green-600">{stats.activeUsers}</p>
                </div>
                <Users className="text-green-500" size={40} />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Promedio Correctas</p>
                  <p className="text-3xl font-bold text-blue-600">{stats.averageCorrectAnswers.toFixed(1)}</p>
                </div>
                <TrendingUp className="text-blue-500" size={40} />
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Promedio Intentos</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.averageAttempts.toFixed(1)}</p>
                </div>
                <HelpCircle className="text-orange-500" size={40} />
              </div>
            </div>
          </div>
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Lista de Usuarios</h2>
              <button
                onClick={exportToCSV}
                className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                <Download className="mr-2" size={20} />
                Exportar CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Teléfono</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conectado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expira</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.phone}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.connectedAt).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.expiresAt).toLocaleDateString('es-AR')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.correctAnswers}/5 ({user.totalAttempts} intentos)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Questions Tab */}
        {activeTab === 'questions' && (
          <div>
            <div className="mb-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Banco de Preguntas</h2>
              <button
                onClick={() => setShowQuestionForm(true)}
                className="flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                <Plus className="mr-2" size={20} />
                Nueva Pregunta
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {questions.map((q) => (
                <div key={q.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <span className="inline-block px-3 py-1 text-xs font-semibold text-primary bg-primary bg-opacity-10 rounded-full mb-2">
                        {q.category}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">{q.question}</h3>
                      <div className="space-y-2">
                        {q.options.map((opt, idx) => (
                          <div key={idx} className={`flex items-center ${idx === q.correctAnswer ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                            <span className="mr-2">{idx === q.correctAnswer ? '✓' : '○'}</span>
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingQuestion(q);
                          setShowQuestionForm(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit size={20} />
                      </button>
                      <button
                        onClick={() => deleteQuestion(q.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Nota: Aquí irían los modals para agregar/editar preguntas */}
      {/* Por simplicidad, no los incluyo ahora pero están en la versión completa */}
    </div>
  );
}
