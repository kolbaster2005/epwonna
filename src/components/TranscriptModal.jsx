// Показывает полный текст аудирования — доступ к самой кнопке есть у
// всех (см. TestPage.jsx), но открыть эту модалку может только PRO;
// не-pro вместо неё видит alertMessage с предложением подписки.
export default function TranscriptModal({ title, transcript, onClose }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal transcript-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <h3>Транскрипция{title ? `: ${title}` : ''}</h3>
        <p className="transcript-modal-text">{transcript}</p>
      </div>
    </div>
  )
}
