import ModalOverlay from './ModalOverlay.jsx'

// Показывает полный текст аудирования — доступ к самой кнопке есть у
// всех (см. TestPage.jsx), но открыть эту модалку может только PRO;
// не-pro вместо неё видит UpsellModal.
export default function TranscriptModal({ title, transcript, onClose }) {
  return (
    <ModalOverlay onClose={onClose}>
      <div className="modal transcript-modal">
        <button type="button" className="modal-close" onClick={onClose} aria-label="Закрыть">✕</button>
        <h3>Транскрипция{title ? `: ${title}` : ''}</h3>
        <p className="transcript-modal-text">{transcript}</p>
      </div>
    </ModalOverlay>
  )
}
