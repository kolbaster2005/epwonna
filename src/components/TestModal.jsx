import { useNavigate } from 'react-router-dom'
import { pluralizeRu } from '../utils/pluralize.js'
import ModalOverlay from './ModalOverlay.jsx'

export default function TestModal({ exam, test, onClose }) {
  const navigate = useNavigate()

  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <div
          className="modal-thumb"
          style={{ background: `linear-gradient(135deg, ${exam.color}, ${exam.colorDark})` }}
        >
          {exam.label}
        </div>
        <h3>{test.t}</h3>
        <div className="test-meta modal-meta">
          <span>{test.questionsCount} {pluralizeRu(test.questionsCount, ['вопрос', 'вопроса', 'вопросов'])}</span>
          <span>{test.durationMinutes} мин</span>
          <span className={test.isOfficial ? 'badge-official' : 'badge-unofficial'}>
            {test.isOfficial ? 'Официальный' : 'Неофициальный'}
          </span>
        </div>
        <p>{test.d} Полное описание пробника и структура тестирования появятся здесь перед стартом.</p>
        <div className="modal-actions">
          <button
            className="btn btn-primary"
            style={{ flex: 1, justifyContent: 'center' }}
            onClick={() => navigate(`/${exam.key}/test/${test.id}`)}
          >
            Начать тестирование
          </button>
          <button className="btn btn-outline" onClick={onClose}>Закрыть</button>
        </div>
      </div>
    </ModalOverlay>
  )
}
