import { supabase } from '../lib/supabaseClient.js'

export async function submitQuestionReport({ userId, email, taskId, taskNumber, message }) {
  try {
    const { error } = await supabase.from('question_reports').insert({
      user_id: userId,
      email,
      task_id: taskId,
      task_number: taskNumber ?? null,
      message,
    })
    if (error) throw error
    return true
  } catch (err) {
    console.error('[reportsService.submitQuestionReport]', err)
    throw err instanceof Error ? err : new Error(err?.message || 'Не удалось отправить обращение.')
  }
}

export async function listQuestionReports() {
  try {
    const { data, error } = await supabase.from('question_reports').select('*').order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((row) => ({
      id: row.id,
      taskId: row.task_id,
      taskNumber: row.task_number,
      email: row.email,
      message: row.message,
      status: row.status,
      createdAt: row.created_at,
    }))
  } catch (err) {
    console.error('[reportsService.listQuestionReports]', err)
    return []
  }
}

export async function setReportStatus(id, status) {
  try {
    const { error } = await supabase.from('question_reports').update({ status }).eq('id', id)
    if (error) throw error
    return true
  } catch (err) {
    console.error('[reportsService.setReportStatus]', err)
    return false
  }
}
