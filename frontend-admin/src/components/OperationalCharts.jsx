import { Card, Col, Row, Typography, Tag } from 'antd';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
const tableData = { labels: ['Bàn 1–5', 'Bàn 6–10', 'Bàn 11–15', 'Bàn 16–20'], datasets: [{ label: 'Lượt phục vụ / tuần', data: [85, 112, 64, 38], backgroundColor: '#a47551', borderRadius: 6 }] };
const customerData = { labels: ['Khách mới / vãng lai', 'Khách quay lại'], datasets: [{ data: [38, 62], backgroundColor: ['#e8bd8b', '#648979'], borderWidth: 0 }] };
const menuData = {
  labels: ['Cà phê sữa', 'Bạc xỉu', 'Trà đào', 'Cà phê đen', 'Sinh tố bơ', 'Sinh tố kiwi', 'Nước ép đào', 'Cà phê Mocha', 'Sinh tố mít', 'Trà sữa socola'],
  datasets: [{ label: 'Ly bán / tuần', data: [180, 155, 132, 118, 95, 18, 15, 12, 9, 6], backgroundColor: ['#648979','#648979','#648979','#648979','#648979','#e8bd8b','#e8bd8b','#e8bd8b','#e8bd8b','#e8bd8b'], borderRadius: 4 }]
};

export default function OperationalCharts() {
  return <section style={{ marginTop: 28 }}>
    <Typography.Title level={4}>Báo cáo vận hành chuyên sâu</Typography.Title>
    <Tag color="gold">Dữ liệu minh họa — chưa kết nối API</Tag>
    <Row gutter={[24,24]} style={{ marginTop: 16 }}>
      <Col xs={24} lg={8}><Card title="Tần suất sử dụng bàn"><div style={{ height: 300 }}><Bar data={tableData} options={options} /></div><Typography.Text type="secondary">So sánh lượt phục vụ từng khu vực trong tuần.</Typography.Text></Card></Col>
      <Col xs={24} lg={8}><Card title="Khách mới và khách quay lại"><div style={{ height: 300 }}><Doughnut data={customerData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: ctx => `${ctx.label}: ${ctx.raw}%` } } } }} /></div><Typography.Text type="secondary">Khách mới 38% · Khách quay lại 62%.</Typography.Text></Card></Col>
      <Col xs={24} lg={8}><Card title="Hiệu suất thực đơn"><div style={{ height: 300 }}><Bar data={menuData} options={{ ...options, indexAxis: 'y', scales: { x: { beginAtZero: true } } }} /></div><Typography.Text type="secondary">Xanh: Top 5 bán chạy · Vàng: Top 5 bán chậm.</Typography.Text></Card></Col>
    </Row>
  </section>;
}
