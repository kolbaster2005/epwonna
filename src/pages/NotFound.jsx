import { Link } from 'react-router-dom'
import { IconSearch } from '../components/Icons.jsx'

export default function NotFound() {
  return (
    <div className="notfound-page">
      <div className="notfound-icon">
        <IconSearch size={30} />
      </div>
      <div className="notfound-code">404</div>
      <h1>Страница не найдена</h1>
      <p>
        Такой страницы нет — возможно, ссылка устарела или в адресе опечатка. Материалы по экзаменам и пробники
        никуда не делись, они на месте.
      </p>
      <div className="notfound-actions">
        <Link className="btn btn-primary" to="/">На главную</Link>
        <Link className="btn btn-outline" to="/epm">К пробникам</Link>
      </div>
    </div>
  )
}
