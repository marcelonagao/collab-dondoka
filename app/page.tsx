'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import {
  LayoutGrid,
  List,
  Plus,
  X,
  GripVertical,
  Trash2,
  Edit2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Clock,
  FolderGit2,
  Search,
  LogOut,
  Shield,
  Users,
  MessageSquare,
  Send,
  BarChart2,
} from 'lucide-react';
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
} from '@dnd-kit/core';
import { Toaster, toast } from 'sonner';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

type Task = { id: string; title: string; board_id: string; custom_fields: any };
type Perfil = { email: string; nome: string; cargo: string };

// --- Utilitários Visuais ---
const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2)
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  return name.substring(0, 2).toUpperCase();
};

const getProjectColor = (projectName: string) => {
  const colors = [
    'bg-blue-500',
    'bg-indigo-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-rose-500',
    'bg-orange-500',
    'bg-emerald-500',
    'bg-teal-500',
  ];
  let hash = 0;
  for (let i = 0; i < (projectName?.length || 0); i++)
    hash = projectName.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
};

const Avatar = ({
  name,
  className = 'w-7 h-7 text-xs',
}: {
  name: string;
  className?: string;
}) => (
  <div
    title={name}
    className={`flex items-center justify-center rounded-full font-bold text-white shadow-sm flex-shrink-0 ${getProjectColor(
      name
    )} ${className}`}
  >
    {getInitials(name)}
  </div>
);

// Status estilo bloco sólido
const StatusBadge = ({ status }: { status: string }) => {
  let color = 'bg-slate-300 text-slate-700';
  if (status === 'Em Progresso') color = 'bg-blue-500 text-white';
  if (status === 'Concluído') color = 'bg-emerald-500 text-white';
  return (
    <div
      className={`w-full py-1.5 px-3 rounded text-center text-[11px] font-bold uppercase tracking-wider ${color}`}
    >
      {status}
    </div>
  );
};

const getProjectHealth = (progress: number, deadlineStr?: string) => {
  if (progress === 100)
    return {
      label: 'Entregue',
      icon: '🔵',
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  if (!deadlineStr)
    return {
      label: 'Andamento',
      icon: '⚪',
      color: 'bg-slate-50 text-slate-700 border-slate-200',
    };
  const diffDays = Math.ceil(
    (new Date(deadlineStr).setHours(0, 0, 0, 0) -
      new Date().setHours(0, 0, 0, 0)) /
      (1000 * 60 * 60 * 24)
  );
  if (diffDays < 0)
    return {
      label: 'Atrasado',
      icon: '🔴',
      color: 'bg-red-50 text-red-700 border-red-200',
    };
  if (diffDays <= 3 && progress < 80)
    return {
      label: 'Risco',
      icon: '🟡',
      color: 'bg-amber-50 text-amber-800 border-amber-200',
    };
  return {
    label: 'No Prazo',
    icon: '🟢',
    color: 'bg-blue-50 text-blue-700 border-blue-200',
  };
};

// --- Componentes do Dnd-Kit ---
function DroppableColumn({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`rounded-xl w-[85vw] md:w-[320px] flex-shrink-0 p-3 min-h-[400px] transition-colors ${
        isOver
          ? 'bg-indigo-50/80 border-2 border-indigo-200'
          : 'bg-slate-100/70 border-2 border-transparent'
      }`}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide">
          {title}
        </h3>
        <span className="text-slate-400 text-xs font-semibold">
          {React.Children.count(children)}
        </span>
      </div>
      <div className="flex flex-col gap-3">{children}</div>
    </div>
  );
}

function DraggableTask({
  task,
  columns,
  onOpenEdit,
  onDelete,
  onMove,
  resolveName,
}: {
  task: Task;
  columns: string[];
  onOpenEdit: (t: Task) => void;
  onDelete: (id: string) => void;
  onMove: (t: Task, dir: 'left' | 'right') => void;
  resolveName: (e: string) => string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: task.id, data: task });
  const [showMenu, setShowMenu] = useState(false);
  const currentStatusIndex = columns.indexOf(
    task.custom_fields?.status_principal
  );
  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${
          isDragging ? 1.03 : 1
        })`,
        zIndex: isDragging ? 50 : undefined,
        opacity: isDragging ? 0.9 : 1,
        boxShadow: isDragging
          ? '0 25px 30px -5px rgb(0 0 0 / 0.15)'
          : undefined,
      }
    : undefined;

  const contribuidores = task.custom_fields?.contribuidores || [];
  const comentarios = task.custom_fields?.comentarios || [];
  const projectColor = getProjectColor(
    task.custom_fields?.projeto_mae || 'Avulso'
  );
  const isDone =
    task.custom_fields?.status_principal === columns[columns.length - 1];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-4 rounded-lg shadow-sm border border-slate-200/60 hover:border-slate-300 transition-all hover:shadow-md flex flex-col group relative overflow-hidden"
      onMouseLeave={() => setShowMenu(false)}
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${projectColor}`}
      ></div>

      <div className="flex justify-between items-start mb-3 pl-2">
        <div
          {...listeners}
          {...attributes}
          className="cursor-grab active:cursor-grabbing text-slate-300 hover:text-slate-500 mr-2 mt-1"
        >
          <GripVertical size={16} />
        </div>
        <div className="flex-1 cursor-pointer" onClick={() => onOpenEdit(task)}>
          <p className="font-semibold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors text-sm">
            {task.title}
          </p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          className="text-slate-400 hover:text-slate-700 p-1 opacity-0 group-hover:opacity-100 transition-opacity md:opacity-100"
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {showMenu && (
        <div className="absolute top-10 right-2 bg-white border border-slate-200 shadow-lg rounded-xl py-1 z-10 w-36 flex flex-col overflow-hidden">
          <button
            onClick={() => onDelete(task.id)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
          >
            <Trash2 size={14} /> Excluir
          </button>
        </div>
      )}

      <div className="pl-2 mt-1">
        <div className="flex flex-wrap gap-1.5 mb-3 items-center">
          {task.custom_fields?.projeto_mae && (
            <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded truncate max-w-[150px]">
              {task.custom_fields.projeto_mae}
            </span>
          )}

          {/* A TAG DE CONCLUSÃO RESTAURADA NO KANBAN */}
          {isDone && task.custom_fields?.data_conclusao && (
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded uppercase flex items-center gap-1">
              ✓ Finalizado:{' '}
              {new Date(task.custom_fields.data_conclusao).toLocaleDateString(
                'pt-BR'
              )}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="flex items-center -space-x-1.5">
            <div className="z-20">
              <Avatar
                name={resolveName(task.custom_fields?.responsavel_email)}
                className="w-6 h-6 text-[10px] ring-2 ring-white"
              />
            </div>
            {contribuidores.slice(0, 1).map((c: string, idx: number) => (
              <Avatar
                key={idx}
                name={resolveName(c)}
                className="w-5 h-5 text-[8px] opacity-80 ring-2 ring-white"
              />
            ))}
            {contribuidores.length > 1 && (
              <div className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200 border-2 border-white text-[8px] font-bold text-slate-600 z-10">
                +{contribuidores.length - 1}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            {comentarios.length > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare size={12} />
                {comentarios.length}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {task.custom_fields?.horas_estimadas || 0}h
            </span>
          </div>
        </div>

        <div className="mt-2 flex justify-between md:opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onMove(task, 'left')}
            disabled={currentStatusIndex <= 0}
            className="p-0.5 text-slate-300 hover:text-indigo-600 disabled:opacity-0"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => onMove(task, 'right')}
            disabled={currentStatusIndex >= columns.length - 1}
            className="p-0.5 text-slate-300 hover:text-indigo-600 disabled:opacity-0"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Tela Principal ---
export default function ProjectBoard() {
  const [session, setSession] = useState<any>(null);
  const [authName, setAuthName] = useState('');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);

  const [team, setTeam] = useState<Perfil[]>([]);
  const [userRole, setUserRole] = useState<'gestor' | 'colaborador'>('gestor');

  const [tasks, setTasks] = useState<Task[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'kanban' | 'executive' | 'team'>(
    'executive'
  );
  const [loading, setLoading] = useState(true);
  const [columns] = useState<string[]>([
    'Backlog',
    'Em Progresso',
    'Concluído',
  ]);
  const [expandedProjects, setExpandedProjects] = useState<string[]>([]);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    task: Task | null;
  }>({ isOpen: false, task: null });
  const [creationMode, setCreationMode] = useState<'single' | 'batch'>(
    'single'
  );
  const [formData, setFormData] = useState({
    title: '',
    responsavel_email: '',
    prioridade: 1,
    horas: 1,
    data_prazo: '',
    contribuidores: '',
  });
  const [newComment, setNewComment] = useState('');

  const [batchProjectName, setBatchProjectName] = useState('');
  const [batchDeadline, setBatchDeadline] = useState('');
  const [batchTasks, setBatchTasks] = useState([
    { id: Date.now(), title: '', responsavel_email: '', horas: 1 },
  ]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) initializeData();
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) initializeData();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel('db-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        fetchTasks
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const initializeData = async () => {
    fetchTeam();
    fetchTasks();
  };
  const fetchTeam = async () => {
    const { data } = await supabase.from('perfis').select('*');
    if (data) setTeam(data);
  };
  const fetchTasks = async () => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setTasks(data);
    setLoading(false);
  };

  const resolveName = (email: string) => {
    if (!email) return 'Sem Dono';
    const cleanEmail = email.trim().toLowerCase();
    const found = team.find((t) => t.email.toLowerCase() === cleanEmail);
    if (found && found.nome) return found.nome;
    return email.split('@')[0];
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    if (isLoginView) {
      const { error } = await supabase.auth.signInWithPassword({
        email: authEmail,
        password: authPassword,
      });
      if (error) toast.error(error.message);
      else toast.success('Bem-vindo!');
    } else {
      const { error } = await supabase.auth.signUp({
        email: authEmail,
        password: authPassword,
        options: { data: { full_name: authName } },
      });
      if (error) toast.error(error.message);
      else toast.success('Conta criada!');
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTasks([]);
    setTeam([]);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const isCompleting = newStatus === columns[columns.length - 1];
    const updatedFields = {
      ...task.custom_fields,
      status_principal: newStatus,
      data_conclusao: isCompleting ? new Date().toISOString() : null,
    };
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, custom_fields: updatedFields } : t
      )
    );
    await supabase
      .from('tasks')
      .update({ custom_fields: updatedFields })
      .eq('id', taskId);
    if (isCompleting) toast.success('✓ Entrega registrada!');
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id)
      updateTaskStatus(active.id as string, over.id as string);
  };
  const handleMove = (task: Task, direction: 'left' | 'right') => {
    const currentIndex = columns.indexOf(task.custom_fields?.status_principal);
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < columns.length)
      updateTaskStatus(task.id, columns[newIndex]);
  };
  const handleDelete = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    await supabase.from('tasks').delete().eq('id', id);
    toast.success('Tarefa excluída');
  };

  const openModal = (task?: Task) => {
    const currentUserEmail = session?.user?.email;
    setNewComment('');
    if (task) {
      setCreationMode('single');
      setFormData({
        title: task.title,
        responsavel_email:
          task.custom_fields?.responsavel_email || currentUserEmail,
        prioridade: task.custom_fields?.prioridade_num || 1,
        horas: task.custom_fields?.horas_estimadas || 1,
        data_prazo: task.custom_fields?.data_prazo || '',
        contribuidores: task.custom_fields?.contribuidores?.join(', ') || '',
      });
      setModalState({ isOpen: true, task });
    } else {
      setFormData({
        title: '',
        responsavel_email: currentUserEmail,
        prioridade: 1,
        horas: 1,
        data_prazo: '',
        contribuidores: '',
      });
      setBatchProjectName('');
      setBatchDeadline('');
      setBatchTasks([
        {
          id: Date.now(),
          title: '',
          responsavel_email: currentUserEmail,
          horas: 1,
        },
      ]);
      setModalState({ isOpen: true, task: null });
    }
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creationMode === 'batch') {
      const tasksToInsert = batchTasks
        .filter((t) => t.title.trim() !== '')
        .map((t) => ({
          title: t.title,
          custom_fields: {
            status_principal: columns[0],
            responsavel_email: t.responsavel_email,
            prioridade_num: 3,
            horas_estimadas: t.horas,
            projeto_mae: batchProjectName,
            data_prazo: batchDeadline,
            contribuidores: [],
            comentarios: [],
          },
        }));
      if (tasksToInsert.length > 0) {
        await supabase.from('tasks').insert(tasksToInsert);
        toast.success(`Projeto criado com ${tasksToInsert.length} tarefas!`);
      }
    } else {
      const contribArray = formData.contribuidores
        .split(',')
        .map((c) => c.trim())
        .filter(Boolean);
      const currentComments = modalState.task?.custom_fields?.comentarios || [];
      const fields = {
        status_principal: modalState.task
          ? modalState.task.custom_fields?.status_principal
          : columns[0],
        responsavel_email: formData.responsavel_email,
        prioridade_num: formData.prioridade,
        horas_estimadas: formData.horas,
        data_prazo: formData.data_prazo,
        projeto_mae: modalState.task?.custom_fields?.projeto_mae,
        contribuidores: contribArray,
        comentarios: currentComments,
      };

      if (modalState.task) {
        await supabase
          .from('tasks')
          .update({ title: formData.title, custom_fields: fields })
          .eq('id', modalState.task.id);
        toast.success('Alterações salvas');
      } else {
        await supabase
          .from('tasks')
          .insert([{ title: formData.title, custom_fields: fields }]);
        toast.success('Nova tarefa criada');
      }
    }
    setModalState({ isOpen: false, task: null });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !modalState.task) return;
    const commenterName = resolveName(session?.user?.email);
    const comment = {
      autor: commenterName,
      texto: newComment,
      data: new Date().toISOString(),
    };
    const updatedComments = [
      ...(modalState.task.custom_fields?.comentarios || []),
      comment,
    ];
    const updatedFields = {
      ...modalState.task.custom_fields,
      comentarios: updatedComments,
    };
    setModalState({
      ...modalState,
      task: { ...modalState.task, custom_fields: updatedFields },
    });
    setTasks(
      tasks.map((t) =>
        t.id === modalState.task!.id
          ? { ...t, custom_fields: updatedFields }
          : t
      )
    );
    setNewComment('');
    await supabase
      .from('tasks')
      .update({ custom_fields: updatedFields })
      .eq('id', modalState.task.id);
  };

  const addBatchRow = () =>
    setBatchTasks([
      ...batchTasks,
      {
        id: Date.now(),
        title: '',
        responsavel_email: session?.user?.email || '',
        horas: 1,
      },
    ]);
  const updateBatchRow = (id: number, field: string, value: any) =>
    setBatchTasks(
      batchTasks.map((t) => (t.id === id ? { ...t, [field]: value } : t))
    );
  const removeBatchRow = (id: number) => {
    if (batchTasks.length > 1)
      setBatchTasks(batchTasks.filter((t) => t.id !== id));
  };
  const toggleProject = (projectName: string) =>
    setExpandedProjects((prev) =>
      prev.includes(projectName)
        ? prev.filter((p) => p !== projectName)
        : [...prev, projectName]
    );

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Toaster position="top-center" richColors />
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-slate-200 p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-indigo-600 tracking-tight">
              Collab.OS
            </h1>
            <p className="text-slate-500 mt-2 text-sm">
              {isLoginView ? 'Acesse sua área de trabalho' : 'Crie sua conta'}
            </p>
          </div>
          <form onSubmit={handleAuth} className="flex flex-col gap-4">
            {!isLoginView && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                E-mail Corporativo
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Senha
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={authLoading}
              className="mt-2 w-full bg-indigo-600 text-white py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {authLoading
                ? 'Processando...'
                : isLoginView
                ? 'Entrar'
                : 'Cadastrar'}
            </button>
          </form>
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsLoginView(!isLoginView)}
              className="text-sm text-indigo-600 hover:underline"
            >
              {isLoginView
                ? 'Não tem conta? Cadastre-se'
                : 'Já tem conta? Faça login'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentUserEmail = session.user.email;
  const roleFilteredTasks = tasks.filter((task) => {
    if (userRole === 'gestor') return true;
    return (
      task.custom_fields?.responsavel_email === currentUserEmail ||
      (task.custom_fields?.contribuidores || []).includes(currentUserEmail)
    );
  });

  const finalFilteredTasks = roleFilteredTasks.filter((task) => {
    const searchLower = searchQuery.toLowerCase();
    const leaderName = resolveName(
      task.custom_fields?.responsavel_email
    ).toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      leaderName.includes(searchLower) ||
      (task.custom_fields?.projeto_mae || '')
        .toLowerCase()
        .includes(searchLower)
    );
  });

  const doneColumnName = columns[columns.length - 1];

  const groupedProjects = finalFilteredTasks.reduce((acc, task) => {
    const projectName = task.custom_fields?.projeto_mae || 'Tarefas Avulsas';
    if (!acc[projectName]) acc[projectName] = { tasks: [], totalHoras: 0, horasConcluidas: 0, deadline: task.custom_fields?.data_prazo };
    const horas = Number(task.custom_fields?.horas_estimadas || 0);
    acc[projectName].tasks.push(task); acc[projectName].totalHoras += horas;
    
    // O "!" no final de deadline avisa ao TypeScript que o valor é seguro
    if (task.custom_fields?.data_prazo && (!acc[projectName].deadline || new Date(task.custom_fields.data_prazo) > new Date(acc[projectName].deadline!))) {
       acc[projectName].deadline = task.custom_fields.data_prazo;
    }
    
    if (task.custom_fields?.status_principal === doneColumnName) acc[projectName].horasConcluidas += horas;
    return acc;
  }, {} as Record<string, { tasks: Task[], totalHoras: number, horasConcluidas: number, deadline?: string }>);

  const teamStats = Object.values(
    finalFilteredTasks.reduce((acc, task) => {
      const email = task.custom_fields?.responsavel_email || 'unassigned';
      if (!acc[email])
        acc[email] = {
          email,
          name: resolveName(email),
          totalTasks: 0,
          completedTasks: 0,
          totalHours: 0,
          completedHours: 0,
          activeTasks: [] as Task[],
        };
      const horas = Number(task.custom_fields?.horas_estimadas || 0);
      acc[email].totalTasks++;
      acc[email].totalHours += horas;
      if (task.custom_fields?.status_principal === doneColumnName) {
        acc[email].completedTasks++;
        acc[email].completedHours += horas;
      } else {
        acc[email].activeTasks.push(task);
      }
      return acc;
    }, {} as Record<string, any>)
  ).sort((a, b) => b.totalTasks - a.totalTasks);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Toaster position="bottom-right" richColors />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-xl font-black text-indigo-600 tracking-tight flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-600 rounded-md flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-sm"></div>
              </div>
              Collab.OS
            </h1>
            <div className="hidden md:flex relative w-64">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                size={16}
              />
              <input
                type="text"
                placeholder="Buscar tarefas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-100 border-transparent rounded-lg text-sm focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg items-center border border-slate-200">
              <button
                onClick={() => {
                  setUserRole('gestor');
                  setView('executive');
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  userRole === 'gestor'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Shield size={14} /> Gestor
              </button>
              <button
                onClick={() => {
                  setUserRole('colaborador');
                  setView('kanban');
                }}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                  userRole === 'colaborador'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Users size={14} /> Equipe
              </button>
            </div>
            <button
              onClick={() => openModal()}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 shadow-sm text-sm font-semibold transition-colors"
            >
              <Plus size={16} /> Nova Tarefa
            </button>
            <div className="pl-4 border-l border-slate-200 flex items-center gap-3">
              <Avatar
                name={resolveName(currentUserEmail)}
                className="w-8 h-8 text-sm"
              />
              <button
                onClick={handleLogout}
                className="text-slate-400 hover:text-red-600 transition-colors"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6 border-t border-slate-100">
          <button
            onClick={() => setView('executive')}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
              view === 'executive'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <List size={16} /> Tabela Principal
          </button>
          <button
            onClick={() => setView('kanban')}
            className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
              view === 'kanban'
                ? 'border-indigo-600 text-indigo-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <LayoutGrid size={16} /> Kanban
          </button>
          {userRole === 'gestor' && (
            <button
              onClick={() => setView('team')}
              className={`flex items-center gap-2 py-3 text-sm font-semibold border-b-2 transition-colors ${
                view === 'team'
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart2 size={16} /> Visão da Equipe
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="md:hidden mb-6 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Buscar tarefas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm outline-none"
          />
        </div>

        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="animate-pulse flex gap-2">
              <div className="w-3 h-3 bg-indigo-400 rounded-full"></div>
              <div className="w-3 h-3 bg-indigo-400 rounded-full animation-delay-200"></div>
              <div className="w-3 h-3 bg-indigo-400 rounded-full animation-delay-400"></div>
            </div>
          </div>
        ) : view === 'kanban' ? (
          <DndContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 md:gap-6 overflow-x-auto pb-6 items-start snap-x snap-mandatory">
              {columns.map((status) => (
                <div key={status} className="snap-center">
                  <DroppableColumn id={status} title={status}>
                    {finalFilteredTasks
                      .filter(
                        (t) => t.custom_fields?.status_principal === status
                      )
                      .map((task) => (
                        <DraggableTask
                          key={task.id}
                          task={task}
                          columns={columns}
                          onOpenEdit={openModal}
                          onDelete={handleDelete}
                          onMove={handleMove}
                          resolveName={resolveName}
                        />
                      ))}
                  </DroppableColumn>
                </div>
              ))}
            </div>
          </DndContext>
        ) : view === 'executive' ? (
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="p-4 w-1/3">Tarefa / Projeto</th>
                    <th className="p-4 w-32 text-center">Responsável</th>
                    <th className="p-4 w-32 text-center">Status</th>
                    <th className="p-4 w-32">Cronograma</th>
                    <th className="p-4 w-40">Progresso (h)</th>
                  </tr>
                </thead>
                {Object.entries(groupedProjects).map(([projectName, data]) => {
                  const progressPercent =
                    data.totalHoras > 0
                      ? Math.round(
                          (data.horasConcluidas / data.totalHoras) * 100
                        )
                      : 0;
                  const isExpanded = expandedProjects.includes(projectName);
                  const pColor = getProjectColor(projectName);

                  return (
                    <tbody key={projectName}>
                      {/* Cabeçalho do Grupo (Resumo Agregado) */}
<tr onClick={() => toggleProject(projectName)} className="border-b border-slate-200 bg-white hover:bg-slate-50 cursor-pointer group shadow-sm">
  <td className="p-3 pl-4">
    <div className="flex items-center">
       <ChevronRight size={18} className={`text-slate-400 mr-2 transition-transform ${isExpanded ? 'rotate-90' : 'group-hover:text-indigo-500'}`} />
       <h2 className={`font-bold text-sm md:text-base flex items-center gap-2 ${pColor.replace('bg-', 'text-')}`}>
         {projectName} <span className="text-xs text-slate-400 font-normal ml-1">({data.tasks.length})</span>
       </h2>
    </div>
  </td>
  <td className="p-3">
    {/* Agrupa e exibe quem está trabalhando neste projeto */}
    <div className="flex items-center -space-x-1.5">
      {Array.from(new Set(data.tasks.map(t => t.custom_fields?.responsavel_email).filter(Boolean))).slice(0, 3).map((email, idx) => (
        <Avatar key={idx} name={resolveName(email as string)} className="w-6 h-6 text-[10px] ring-2 ring-white z-10" />
      ))}
      {new Set(data.tasks.map(t => t.custom_fields?.responsavel_email).filter(Boolean)).size > 3 && (
        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 border-2 border-white text-[9px] font-bold text-slate-600 z-20">
          +{new Set(data.tasks.map(t => t.custom_fields?.responsavel_email).filter(Boolean)).size - 3}
        </div>
      )}
    </div>
  </td>
  <td className="p-3">
    {/* Etiqueta de Saúde do Projeto */}
    <span className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border inline-flex items-center gap-1 shadow-sm ${health.color}`}>
      {health.icon} {health.label}
    </span>
  </td>
  <td className="p-3 text-xs text-slate-600 font-medium">
    {data.deadline ? new Date(data.deadline).toLocaleDateString('pt-BR') : '-'}
  </td>
  <td className="p-3 w-40">
    {/* Barra de Progresso do Projeto */}
    <div className="flex items-center gap-2">
      <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
        <div className="bg-indigo-500 h-1.5 rounded-full transition-all duration-700" style={{ width: `${progressPercent}%` }}></div>
      </div>
      <span className="text-[10px] font-bold text-slate-500 w-8 text-right">{progressPercent}%</span>
    </div>
  </td>
</tr>

                      {isExpanded &&
                        [...data.tasks]
                          .sort(
                            (a, b) =>
                              columns.indexOf(
                                a.custom_fields?.status_principal || ''
                              ) -
                              columns.indexOf(
                                b.custom_fields?.status_principal || ''
                              )
                          )
                          .map((task) => (
                            <tr
                              key={task.id}
                              className="border-b border-slate-100 bg-white hover:bg-slate-50 transition-colors relative"
                            >
                              <td className="p-3 pl-10">
                                <div
                                  className={`absolute left-0 top-0 bottom-0 w-1.5 ${pColor}`}
                                ></div>
                                <span
                                  onClick={() => openModal(task)}
                                  className="font-medium text-sm text-slate-800 hover:text-indigo-600 cursor-pointer"
                                >
                                  {task.title}
                                </span>
                                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                  {task.custom_fields?.prioridade_num && (
                                    <span>
                                      Prio {task.custom_fields.prioridade_num}
                                    </span>
                                  )}
                                  {task.custom_fields?.comentarios?.length >
                                    0 && (
                                    <span className="flex items-center gap-1">
                                      <MessageSquare size={12} />
                                      {task.custom_fields.comentarios.length}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex justify-center">
                                  <Avatar
                                    name={resolveName(
                                      task.custom_fields?.responsavel_email
                                    )}
                                    className="w-8 h-8 text-sm"
                                  />
                                </div>
                              </td>
                              <td className="p-3">
                                <StatusBadge
                                  status={task.custom_fields?.status_principal}
                                />
                              </td>
                              <td className="p-3 text-sm text-slate-600">
                                <div className="flex flex-col">
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] uppercase text-slate-400 font-bold">
                                      Prazo:
                                    </span>
                                    <span className="font-medium">
                                      {task.custom_fields?.data_prazo
                                        ? new Date(
                                            task.custom_fields.data_prazo
                                          ).toLocaleDateString('pt-BR')
                                        : '-'}
                                    </span>
                                  </div>

                                  {/* TAG DE CONCLUSÃO NA TABELA (EXPLICITA E DESTACADA) */}
                                  {task.custom_fields?.data_conclusao && (
                                    <span className="text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded mt-1 inline-block font-bold">
                                      ✓ Entregue:{' '}
                                      {new Date(
                                        task.custom_fields.data_conclusao
                                      ).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2 w-full">
                                  <span className="text-xs text-slate-500 font-medium w-8 text-right">
                                    {task.custom_fields?.horas_estimadas || 0}h
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                    </tbody>
                  );
                })}
              </table>
            </div>
          </div>
        ) : (
          view === 'team' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamStats.map((member: any) => {
                const progressPercent =
                  member.totalHours > 0
                    ? Math.round(
                        (member.completedHours / member.totalHours) * 100
                      )
                    : 0;
                return (
                  <div
                    key={member.email}
                    className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col"
                  >
                    <div className="p-5 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
                      <Avatar
                        name={member.name}
                        className="w-14 h-14 text-xl"
                      />
                      <div>
                        <h3 className="font-bold text-lg text-slate-800 leading-tight">
                          {member.name}
                        </h3>
                        <p className="text-xs text-slate-500">{member.email}</p>
                      </div>
                    </div>
                    <div className="p-5">
                      <div className="grid grid-cols-2 gap-4 mb-5">
                        <div className="bg-slate-50 rounded-lg p-3 text-center border border-slate-100">
                          <p className="text-xs font-bold text-slate-500 uppercase">
                            Tarefas
                          </p>
                          <p className="text-2xl font-black text-slate-800">
                            {member.totalTasks}
                          </p>
                        </div>
                        <div className="bg-indigo-50 rounded-lg p-3 text-center border border-indigo-100">
                          <p className="text-xs font-bold text-indigo-500 uppercase">
                            Carga (h)
                          </p>
                          <p className="text-2xl font-black text-indigo-700">
                            {member.totalHours}h
                          </p>
                        </div>
                      </div>
                      <div className="mb-2 flex justify-between text-xs font-bold text-slate-600">
                        <span>Progresso de Entregas</span>
                        <span>{progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 mb-6 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-2.5 rounded-full transition-all duration-700"
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                      <h4 className="text-xs font-bold text-slate-400 uppercase mb-3 border-b border-slate-100 pb-2">
                        Foco Atual ({member.activeTasks.length})
                      </h4>
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {member.activeTasks.length === 0 ? (
                          <p className="text-sm text-slate-400 italic">
                            Nenhuma tarefa pendente.
                          </p>
                        ) : (
                          [...member.activeTasks]
                            .sort(
                              (a: any, b: any) =>
                                columns.indexOf(
                                  b.custom_fields?.status_principal || ''
                                ) -
                                columns.indexOf(
                                  a.custom_fields?.status_principal || ''
                                )
                            )
                            .map((t: any) => (
                              <div
                                key={t.id}
                                onClick={() => openModal(t)}
                                className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all group"
                              >
                                {/* Título e Projeto Empilhados */}
                                <div className="flex flex-col overflow-hidden pr-3">
                                  <span className="text-sm text-slate-700 font-medium truncate group-hover:text-indigo-600 transition-colors">
                                    {t.title}
                                  </span>
                                  {t.custom_fields?.projeto_mae && (
                                    <span className="text-[10px] text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                      <FolderGit2
                                        size={10}
                                        className="flex-shrink-0"
                                      />{' '}
                                      {t.custom_fields.projeto_mae}
                                    </span>
                                  )}
                                </div>

                                {/* Badge de Status à Direita */}
                                <span
                                  className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded whitespace-nowrap flex-shrink-0 ${
                                    t.custom_fields?.status_principal ===
                                    'Em Progresso'
                                      ? 'bg-blue-100 text-blue-700'
                                      : 'bg-slate-200 text-slate-600'
                                  }`}
                                >
                                  {t.custom_fields?.status_principal}
                                </span>
                              </div>
                            ))
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </main>

      {/* Modal Manutenção */}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-end md:items-center justify-center md:p-4 z-50">
          <div className="bg-white rounded-t-3xl md:rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] md:max-h-[85vh] overflow-hidden flex flex-col md:flex-row transition-transform transform">
            <div
              className={`p-5 md:p-7 overflow-y-auto ${
                modalState.task
                  ? 'md:w-1/2 border-b md:border-b-0 md:border-r border-slate-200'
                  : 'w-full'
              }`}
            >
              <div className="flex justify-between items-center mb-5 border-b border-slate-100 pb-3">
                <h2 className="text-lg md:text-xl font-bold text-slate-800">
                  {modalState.task ? 'Detalhes da Tarefa' : 'Nova Criação'}
                </h2>
                {!modalState.task && (
                  <button
                    onClick={() => setModalState({ isOpen: false, task: null })}
                    className="text-slate-400 bg-slate-100 rounded-full p-2"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>

              {!modalState.task && (
                <div className="flex gap-2 mb-5 bg-slate-100 p-1.5 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setCreationMode('single')}
                    className={`flex-1 py-1.5 rounded-lg font-medium text-sm transition-all ${
                      creationMode === 'single'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Tarefa Avulsa
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreationMode('batch')}
                    className={`flex-1 py-1.5 rounded-lg font-medium text-sm transition-all ${
                      creationMode === 'batch'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500'
                    }`}
                  >
                    Criar Projeto
                  </button>
                </div>
              )}

              <form
                id="task-form"
                onSubmit={handleSubmitTask}
                className="flex flex-col gap-4"
              >
                {creationMode === 'single' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">
                        Título da Tarefa
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.title}
                        onChange={(e) =>
                          setFormData({ ...formData, title: e.target.value })
                        }
                        className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Responsável
                        </label>
                        <select
                          required
                          value={formData.responsavel_email}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              responsavel_email: e.target.value,
                            })
                          }
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        >
                          <option value="">Selecione...</option>
                          {team.map((m) => (
                            <option key={m.email} value={m.email}>
                              {m.nome || m.email}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Contribuidores (E-mails)
                        </label>
                        <input
                          type="text"
                          placeholder="joao@, maria@"
                          value={formData.contribuidores}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              contribuidores: e.target.value,
                            })
                          }
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-1">
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Prazo
                        </label>
                        <input
                          type="date"
                          value={formData.data_prazo}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              data_prazo: e.target.value,
                            })
                          }
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Prio (1-5)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="5"
                          value={formData.prioridade}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              prioridade: Number(e.target.value),
                            })
                          }
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Esforço (h)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.5"
                          value={formData.horas}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              horas: Number(e.target.value),
                            })
                          }
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                  </>
                )}

                {creationMode === 'batch' && !modalState.task && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Nome do Projeto
                        </label>
                        <input
                          required
                          type="text"
                          value={batchProjectName}
                          onChange={(e) => setBatchProjectName(e.target.value)}
                          className="w-full border border-indigo-200 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-indigo-50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">
                          Prazo de Entrega Geral
                        </label>
                        <input
                          required
                          type="date"
                          value={batchDeadline}
                          onChange={(e) => setBatchDeadline(e.target.value)}
                          className="w-full border border-slate-300 rounded-xl p-2.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="border border-slate-200 rounded-xl overflow-hidden mt-2">
                      <div className="bg-slate-50 p-2 flex gap-2 text-[10px] font-bold text-slate-500 uppercase">
                        <div className="flex-[2]">Nome</div>
                        <div className="flex-1 hidden md:block">Líder</div>
                        <div className="w-12 md:w-16">Horas</div>
                        <div className="w-6"></div>
                      </div>
                      <div className="max-h-40 md:max-h-60 overflow-y-auto p-2 flex flex-col gap-2">
                        {batchTasks.map((t) => (
                          <div key={t.id} className="flex gap-2 items-center">
                            <input
                              required
                              type="text"
                              value={t.title}
                              onChange={(e) =>
                                updateBatchRow(t.id, 'title', e.target.value)
                              }
                              className="flex-[2] border border-slate-200 rounded-md p-1.5 text-xs outline-none focus:border-indigo-500"
                            />
                            <select
                              required
                              value={t.responsavel_email}
                              onChange={(e) =>
                                updateBatchRow(
                                  t.id,
                                  'responsavel_email',
                                  e.target.value
                                )
                              }
                              className="flex-1 hidden md:block border border-slate-200 rounded-md p-1.5 text-xs outline-none focus:border-indigo-500 bg-white"
                            >
                              {team.map((m) => (
                                <option key={m.email} value={m.email}>
                                  {m.nome || m.email.split('@')[0]}
                                </option>
                              ))}
                            </select>
                            <input
                              required
                              type="number"
                              min="0.5"
                              step="0.5"
                              value={t.horas}
                              onChange={(e) =>
                                updateBatchRow(
                                  t.id,
                                  'horas',
                                  Number(e.target.value)
                                )
                              }
                              className="w-12 md:w-16 border border-slate-200 rounded-md p-1.5 text-xs outline-none focus:border-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => removeBatchRow(t.id)}
                              className="w-6 text-slate-400 hover:text-red-500 flex justify-center"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="p-2 bg-slate-50 border-t border-slate-200">
                        <button
                          type="button"
                          onClick={addBatchRow}
                          className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:text-indigo-800"
                        >
                          <Plus size={14} /> Linha
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="mt-2 flex gap-3 pt-4 border-t border-slate-100">
                  {!modalState.task && (
                    <button
                      type="button"
                      onClick={() =>
                        setModalState({ isOpen: false, task: null })
                      }
                      className="flex-1 bg-white border border-slate-300 text-slate-700 py-2.5 rounded-xl hover:bg-slate-50 text-sm font-medium"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    form="task-form"
                    className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 shadow-sm text-sm font-medium"
                  >
                    {modalState.task
                      ? 'Salvar Edição'
                      : creationMode === 'batch'
                      ? `Criar (${batchTasks.length})`
                      : 'Criar Tarefa'}
                  </button>
                </div>
              </form>
            </div>

            {modalState.task && (
              <div className="md:w-1/2 bg-slate-50/50 flex flex-col h-[400px] md:h-auto">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white md:bg-transparent">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm md:text-base">
                    <MessageSquare size={16} /> Discussão
                  </h3>
                  <button
                    onClick={() => setModalState({ isOpen: false, task: null })}
                    className="text-slate-400 bg-slate-100 rounded-full p-1.5"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3">
                  {(modalState.task.custom_fields?.comentarios || []).length ===
                  0 ? (
                    <div className="text-center text-slate-400 text-xs mt-10">
                      Nenhum comentário.
                    </div>
                  ) : (
                    modalState.task.custom_fields.comentarios.map(
                      (c: any, i: number) => {
                        const isMe =
                          c.autor === resolveName(session?.user?.email);
                        return (
                          <div
                            key={i}
                            className={`flex gap-2 ${
                              isMe ? 'flex-row-reverse' : ''
                            }`}
                          >
                            <Avatar
                              name={c.autor}
                              className="w-6 h-6 md:w-8 md:h-8 text-xs"
                            />
                            <div
                              className={`max-w-[85%] rounded-2xl p-2.5 shadow-sm ${
                                isMe
                                  ? 'bg-indigo-600 text-white rounded-tr-none'
                                  : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                              }`}
                            >
                              <div
                                className={`text-[9px] md:text-[10px] font-medium mb-0.5 ${
                                  isMe ? 'text-indigo-200' : 'text-slate-500'
                                }`}
                              >
                                {c.autor} •{' '}
                                {new Date(c.data).toLocaleTimeString('pt-BR', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </div>
                              <p className="text-xs md:text-sm">{c.texto}</p>
                            </div>
                          </div>
                        );
                      }
                    )
                  )}
                </div>

                <div className="p-3 md:p-4 bg-white border-t border-slate-200">
                  <form onSubmit={handleAddComment} className="relative">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Comentar..."
                      className="w-full bg-slate-100 border-none rounded-full py-2.5 md:py-3 pl-4 pr-12 text-xs md:text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!newComment.trim()}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-indigo-600 text-white p-1.5 md:p-2 rounded-full hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                      <Send size={14} />
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
