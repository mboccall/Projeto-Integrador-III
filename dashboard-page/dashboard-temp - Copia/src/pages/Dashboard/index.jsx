import { useEffect, useState, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import './style.css';

export default function Dashboard() {
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertaAtivo, setAlertaAtivo] = useState(false);
  
  // Refs para os gráficos
  const tempChartRef = useRef(null);
  const umidChartRef = useRef(null);
  const tempChartInstance = useRef(null);
  const umidChartInstance = useRef(null);
  
  const wsRef = useRef(null);

  // Conexão WebSocket e busca inicial
  useEffect(() => {
    // Conexão WebSocket
    wsRef.current = new WebSocket(`ws://${window.location.hostname}:3000`);

    wsRef.current.onmessage = (event) => {
      const { type, data } = JSON.parse(event.data);
      
      if (type === 'ATUALIZAR_DASHBOARD') {
        setSensorData(prev => {
          const newData = [...prev, {
            ...data,
            localTime: data.formattedTime || data.timestamp
          }];
          return newData.slice(-50); // Mantém apenas as 50 mais recentes
        });
      }
      
      if (type === 'ALERTA') {
        setAlertaAtivo(true);
        new Audio('/alert-sound.mp3').play().catch(e => console.log("Não foi possível tocar som:", e));
      }
    };

    wsRef.current.onerror = (error) => {
      console.error('Erro WebSocket:', error);
      setError("Erro na conexão em tempo real");
    };

    // Busca inicial dos dados
    const fetchInitialData = async () => {
      try {
        const response = await fetch('/api/sensor-data');
        if (!response.ok) throw new Error('Erro ao carregar dados');
        
        const data = await response.json();
        
        setSensorData(data.map(item => ({
          ...item,
          localTime: item.formattedTime || item.timestamp
        })));
        
        if (data.some(item => item.alerta)) {
          setAlertaAtivo(true);
        }
      } catch (err) {
        console.error("Erro ao buscar dados:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, []);

  // Função para extrair apenas a hora (HH:MM:SS)
  const extractTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    
    // Para formato "YYYY-MM-DD HH:MM:SS"
    if (dateTimeStr.includes(' ')) {
      return dateTimeStr.split(' ')[1];
    }
    
    // Para formato ISO "YYYY-MM-DDTHH:MM:SS"
    if (dateTimeStr.includes('T')) {
      return dateTimeStr.split('T')[1].substring(0, 8);
    }
    
    return dateTimeStr; // Fallback
  };

  // Efeito para o gráfico de temperatura
  useEffect(() => {
    if (loading || !tempChartRef.current || sensorData.length === 0) return;

    const ctx = tempChartRef.current.getContext('2d');
    if (!ctx) return;

    if (tempChartInstance.current) {
      tempChartInstance.current.destroy();
    }

    const tempValues = sensorData.map(item => item.temperatura);
    const minTemp = Math.min(...tempValues);
    const maxTemp = Math.max(...tempValues);

    tempChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sensorData.map(item => extractTime(item.localTime)),
        datasets: [{
          label: 'Temperatura (°C)',
          data: tempValues,
          borderColor: '#ff6384',
          backgroundColor: 'rgba(90, 18, 34, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: sensorData.map(item => 
            item.temperatura > 25 ? '#ff0000' : '#ff6384'
          ),
          pointRadius: sensorData.map(item => 
            item.temperatura > 25 ? 5 : 3
          )
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              title: (context) => {
                const data = sensorData[context[0].dataIndex];
                return data.localTime;
              }
            }
          }
        },
        scales: {
          y: {
            min: Math.max(0, minTemp - 5),
            max: maxTemp + 5,
            title: { display: true, text: 'Temperatura (°C)' }
          }
        }
      }
    });

    return () => {
      if (tempChartInstance.current) {
        tempChartInstance.current.destroy();
      }
    };
  }, [sensorData, loading]);

  // Efeito para o gráfico de umidade
  useEffect(() => {
    if (loading || !umidChartRef.current || sensorData.length === 0) return;

    const ctx = umidChartRef.current.getContext('2d');
    if (!ctx) return;

    if (umidChartInstance.current) {
      umidChartInstance.current.destroy();
    }

    const umidValues = sensorData.map(item => item.umidade);
    const minUmid = Math.min(...umidValues);
    const maxUmid = Math.max(...umidValues);

    umidChartInstance.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels: sensorData.map(item => extractTime(item.localTime)),
        datasets: [{
          label: 'Umidade (%)',
          data: umidValues,
          borderColor: '#36a2eb',
          backgroundColor: 'rgba(54, 162, 235, 0.1)',
          borderWidth: 2,
          tension: 0.3,
          pointBackgroundColor: sensorData.map(item => 
            item.umidade < 60 || item.umidade > 90 ? '#ff0000' : '#36a2eb'
          ),
          pointRadius: sensorData.map(item => 
            item.umidade < 60 || item.umidade > 90 ? 5 : 3
          )
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true },
          tooltip: {
            callbacks: {
              title: (context) => {
                const data = sensorData[context[0].dataIndex];
                return data.localTime;
              }
            }
          },
          annotation: {
            annotations: {
              box1: {
                type: 'box',
                yMin: 60,
                yMax: 90,
                backgroundColor: 'rgba(0, 255, 0, 0.1)',
                borderWidth: 0
              }
            }
          }
        },
        scales: {
          y: {
            min: Math.max(0, minUmid - 5),
            max: Math.min(100, maxUmid + 5),
            title: { display: true, text: 'Umidade (%)' }
          }
        }
      }
    });

    return () => {
      if (umidChartInstance.current) {
        umidChartInstance.current.destroy();
      }
    };
  }, [sensorData, loading]);

  // ... (o restante do seu código de renderização permanece igual)
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <p>⚠️ Erro ao carregar dados: {error}</p>
        <button onClick={() => window.location.reload()}>Tentar novamente</button>
      </div>
    );
  }

  // Calcular estatísticas
  const tempStats = {
    min: sensorData.length > 0 ? Math.min(...sensorData.map(d => d.temperatura)) : 0,
    max: sensorData.length > 0 ? Math.max(...sensorData.map(d => d.temperatura)) : 0,
    avg: sensorData.length > 0 ? 
      sensorData.reduce((sum, d) => sum + d.temperatura, 0) / sensorData.length : 0
  };

  const umidStats = {
    min: sensorData.length > 0 ? Math.min(...sensorData.map(d => d.umidade)) : 0,
    max: sensorData.length > 0 ? Math.max(...sensorData.map(d => d.umidade)) : 0,
    avg: sensorData.length > 0 ? 
      sensorData.reduce((sum, d) => sum + d.umidade, 0) / sensorData.length : 0
  };

  return (
    <div className="dashboard-container">
      {alertaAtivo && (
        <div className="alert-banner">
          🚨 ALERTA: Valores fora da faixa normal! Verifique os sensores.
        </div>
      )}
      
      <div className="dashboard-header">
        <h1>Monitoramento em Tempo Real</h1>
        <div className="connection-status">
          <span className={`status-indicator ${wsRef.current?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'}`}>
            {wsRef.current?.readyState === WebSocket.OPEN ? 'Online' : 'Offline'}
          </span>
        </div>
      </div>

      <div className="charts-row">
        <div className="chart-wrapper">
          <h3>Temperatura (°C)</h3>
          <div className="chart-container">
            <canvas ref={tempChartRef} />
          </div>
          <div className="stats-box">
            <div className="stat-item">
              <span className="stat-label">Mínima:</span>
              <span className="stat-value">{tempStats.min.toFixed(1)}°C</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Média:</span>
              <span className="stat-value">{tempStats.avg.toFixed(1)}°C</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Máxima:</span>
              <span className="stat-value">{tempStats.max.toFixed(1)}°C</span>
            </div>
          </div>
        </div>
        
        <div className="chart-wrapper">
          <h3>Umidade (%)</h3>
          <div className="chart-container">
            <canvas ref={umidChartRef} />
          </div>
          <div className="stats-box">
            <div className="stat-item">
              <span className="stat-label">Mínima:</span>
              <span className="stat-value">{umidStats.min.toFixed(1)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Média:</span>
              <span className="stat-value">{umidStats.avg.toFixed(1)}%</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Máxima:</span>
              <span className="stat-value">{umidStats.max.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="readings-section">
        <h2>Últimas Leituras</h2>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Temperatura (°C)</th>
                <th>Umidade (%)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {sensorData.slice(0, 10).map((data, index) => (
                <tr key={index} className={data.alerta ? 'alert-row' : ''}>
                  <td>{extractTime(data.localTime)}</td>
                  <td>{data.temperatura?.toFixed(1) || 'N/A'}</td>
                  <td>{data.umidade?.toFixed(1) || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${data.alerta ? 'alert' : 'normal'}`}>
                      {data.alerta ? 'Alerta' : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}