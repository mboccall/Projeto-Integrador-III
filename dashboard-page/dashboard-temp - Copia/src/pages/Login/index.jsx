import { useNavigate } from 'react-router-dom';
import './style.css';

function Login() {
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    // Redireciona diretamente sem verificação
    navigate('/dashboard');
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit}>
        <h1>Login</h1>
        {/* Mantemos os campos, mas não são mais obrigatórios */}
        <input
          type="text"
          placeholder="Usuário"
        />
        <input
          type="password"
          placeholder="Senha"
        />
        <button type="submit">Entrar</button>
      </form>
    </div>
  );
}

export default Login;