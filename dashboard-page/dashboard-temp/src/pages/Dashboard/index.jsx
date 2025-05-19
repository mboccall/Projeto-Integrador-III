import { useEffect, useState, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';
import './style.css';

Chart.register(zoomPlugin);

export default function Dashboard() {
  const [sensorData, setSensorData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertaAtivo, setAlertaAtivo] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  const tempChartRef = useRef(null);
  const umidChartRef = useRef(null);
  const tempChartInstance = useRef(null);
  const umidChartInstance = useRef(null);
  const wsRef = useRef(null);

  // Extrai apenas a hora do timestamp
  const extractTime = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    if (dateTimeStr.includes(' ')) {
      return dateTimeStr.split(' ')[1];
    }
    if (dateTimeStr.includes('T')) {
      return dateTimeStr.split('T')[1].substring(0, 8);
    }
    return dateTimeStr;
  };

  // Busca dados iniciais com base na data selecionada
  const fetchInitialData = async () => {
    try {
      const url = selectedDate ? `/api/sensor-data?date=${selectedDate}` : '/api/sensor-data';
      const response = await fetch(url);
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Conexão WebSocket
  useEffect(() => {
    if (realTimeEnabled) {
      wsRef.current = new WebSocket(`ws://${window.location.hostname}:3000`);
      wsRef.current.onmessage = (event) => {
        const { type, data } = JSON.parse(event.data);
        if (type === 'ATUALIZAR_DASHBOARD') {
          setSensorData(prev => {
            const newData = [...prev, {
              ...data,
              localTime: data.formattedTime || data.timestamp
            }];
            return newData.slice(-200); // Mantém histórico maior
          });
        }
        if (type === 'ALERTA') {
          setAlertaAtivo(true);
          playAlertSound();
        }
      };
      wsRef.current.onerror = (error) => {
        console.error('Erro WebSocket:', error);
        setError("Erro na conexão em tempo real");
      };
    }
    return () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }
    };
  }, [realTimeEnabled]);

  // Busca inicial dos dados quando a data muda
  useEffect(() => {
    fetchInitialData();
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    setRealTimeEnabled(isToday);
  }, [selectedDate]);

  // Toca som de alerta
  const playAlertSound = () => {
    const audio = new Audio('/alert-sound.mp3');
    audio.play().catch(e => console.log("Não foi possível tocar som:", e));
  };

  // Gráfico de Temperatura
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
          backgroundColor: 'rgba(255, 99, 132, 0.1)',
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
          },
          zoom: {
            pan: { enabled: true, mode: 'x' },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'x'
            }
          }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 10
            }
          },
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

  // Gráfico de Umidade
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
          zoom: {
            pan: { enabled: true, mode: 'x' },
            zoom: {
              wheel: { enabled: true },
              pinch: { enabled: true },
              mode: 'x'
            }
          }
        },
        scales: {
          x: {
            ticks: {
              autoSkip: true,
              maxTicksLimit: 10
            }
          },
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

  // Carregando
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando dados...</p>
      </div>
    );
  }

  // Erro
  if (error) {
    return (
      <div className="error-container">
        <p>⚠️ Erro ao carregar dados: {error}</p>
        <button onClick={() => window.location.reload()}>Tentar novamente</button>
      </div>
    );
  }

  return (
    <div className="dashboard-container full-height">
      {/* Alerta */}
      {alertaAtivo && (
        <div className="alert-banner">
          🚨 ALERTA: Valores fora da faixa normal! Verifique os sensores.
        </div>
      )}

      {/* Cabeçalho */}
      <header className="dashboard-header">

        <h1>Sistema de Monitoramento</h1>
        
        <div className="controls-row">
          <div className="date-picker-container">
            <label htmlFor="datePicker" className="date-label">Selecione a data:</label>
            <input
              id="datePicker"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="date-picker"
            />
          </div>
          <div className="status-indicators">
            <span className={`real-time-status ${realTimeEnabled ? 'active' : ''}`}>
              {realTimeEnabled ? 'Atualização em tempo real ativada' : 'Visualizando dados históricos'}
            </span>
            <span className={`status-indicator ${wsRef.current?.readyState === WebSocket.OPEN ? 'connected' : 'disconnected'}`}>
              {wsRef.current?.readyState === WebSocket.OPEN ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>
      </header>

      {/* Gráficos */}
      <main className="charts-row">
        {/* Gráfico de Temperatura */}
        <section className="chart-wrapper ">
          <h3>Temperatura (°C)</h3>
          <div className="chart-container">
            <canvas ref={tempChartRef}></canvas>
          </div>
          <div className="stats-box">
            <div><strong>Mínima:</strong> {tempStats.min.toFixed(1)}°C</div>
            <div><strong>Média:</strong> {tempStats.avg.toFixed(1)}°C</div>
            <div><strong>Máxima:</strong> {tempStats.max.toFixed(1)}°C</div>
          </div>
        </section>

        {/* Gráfico de Umidade */}
        <section className="chart-wrapper ">
          <h3>Umidade (%)</h3>
          <div className="chart-container">
            <canvas ref={umidChartRef}></canvas>
          </div>
          <div className="stats-box">
            <div><strong>Mínima:</strong> {umidStats.min.toFixed(1)}%</div>
            <div><strong>Média:</strong> {umidStats.avg.toFixed(1)}%</div>
            <div><strong>Máxima:</strong> {umidStats.max.toFixed(1)}%</div>
          </div>
        </section>
      </main>

      {/* Tabela de leituras */}
      <section className="readings-section">
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
      </section>
    </div>
  );
}