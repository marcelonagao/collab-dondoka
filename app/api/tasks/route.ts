import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o Supabase no lado do servidor
const SUPABASE_URL = 'https://tnjumrfymbimxfendirz.supabase.co';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRuanVtcmZ5bWJpbXhmZW5kaXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg1MjkxMDcsImV4cCI6MjEwNDEwNTEwN30.kI7cDyEE4wEvO3ddeiu6IfNCZdPW1hDOo77niQ0vle0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { taskId, custom_fields } = body;

    // 1. Verificação de Segurança (Payload)
    if (!taskId || !custom_fields) {
      return NextResponse.json(
        { error: 'ID da tarefa e custom_fields são obrigatórios.' },
        { status: 400 }
      );
    }

    // 2. Validação Dinâmica de Tipos (Protegendo o JSONB)
    // Impede que o frontend envie um texto ("Alta") para um campo numérico
    if (
      custom_fields.prioridade_num !== undefined &&
      typeof custom_fields.prioridade_num !== 'number'
    ) {
      return NextResponse.json(
        { error: 'A prioridade deve ser um número válido.' },
        { status: 422 }
      );
    }

    // 3. Atualiza o banco de dados no Supabase
    // Ao atualizar um JSONB no Supabase dessa forma, substituímos os custom_fields atuais pelos novos
    const { data, error } = await supabase
      .from('tasks')
      .update({ custom_fields })
      .eq('id', taskId)
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, task: data[0] });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
