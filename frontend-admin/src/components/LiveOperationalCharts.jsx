import { useEffect } from 'react';
import { Card, Col, Row, Typography, Button } from 'antd';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { io } from 'socket.io-client';
import API_URL from '../config';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend } from 'chart.js';
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);
const options = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } };
const barData = (rows, color) => ({ labels: rows.map(r => r.label || r.name), datasets: [{ label: 'Lượt / số ly', data: rows.map(r => r.count ?? r.quantity), backgroundColor: color, borderRadius: 5 }] });
function wrapLabel(value) {
  const lines = [];
  let line = '';
  for (const word of String(value).split(/\s+/)) {
    if (line && `${line} ${word}`.length > 18) { lines.push(line); line = word; }
    else line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
const menuOptions = {
  ...options, indexAxis: 'y', layout: { padding: { left: 8, right: 8 } },
  scales: {
    x: { beginAtZero: true, ticks: { precision: 0 } },
    y: { ticks: { autoSkip: false, font: { size: 11 }, callback(value) { return wrapLabel(this.getLabelForValue(value)); } } }
  }
};
export default function LiveOperationalCharts() {
  const client = useQueryClient();
  const [period, setPeriod] = useState('7');
  const [dates, setDates] = useState({ from: '', to: '' });
  const [params, setParams] = useState({ days: 7 });
  const [rangeError, setRangeError] = useState('');
  const today = new Date(Date.now() + 7 * 3600000).toISOString().slice(0,10);
  const { data, isPending, isError, refetch, isFetching } = useQuery({ queryKey: ['operations', params], queryFn: async () => (await axios.get(`${API_URL}/api/reports/operations`, { params })).data, refetchInterval: 30000 });
  const choosePeriod = value => {
    setPeriod(value); setRangeError('');
    if (value !== 'custom') setParams({ days: Number(value) });
  };
  const applyDates = () => {
    if (!dates.from || !dates.to || dates.from > dates.to || dates.to > today) {
      setRangeError('Chọn đủ ngày bắt đầu và kết thúc hợp lệ, không vượt quá hôm nay.'); return;
    }
    setRangeError(''); setParams({ ...dates });
  };
  const controls = <>
    <Typography.Title level={4}>Báo cáo vận hành chuyên sâu</Typography.Title>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
      {[['7','1 tuần'],['30','1 tháng'],['custom','Tùy chọn']].map(([value,label]) => <Button key={value} type={period === value ? 'primary' : 'default'} aria-pressed={period === value} onClick={() => choosePeriod(value)}>{label}</Button>)}
      {period === 'custom' && <>
        <label>Từ ngày <input type="date" value={dates.from} max={dates.to || today} onChange={e => setDates({ ...dates, from: e.target.value })} /></label>
        <label>Đến ngày <input type="date" value={dates.to} min={dates.from || undefined} max={today} onChange={e => setDates({ ...dates, to: e.target.value })} /></label>
        <Button onClick={applyDates}>Áp dụng</Button>
      </>}
      <Typography.Text type="secondary">{period === '30' ? '30 ngày gần nhất, gồm hôm nay' : period === '7' ? '7 ngày gần nhất, gồm hôm nay' : 'Chọn khoảng ngày rồi bấm Áp dụng'}</Typography.Text>
    </div>
    {rangeError && <Typography.Paragraph role="alert" type="danger">{rangeError}</Typography.Paragraph>}
  </>;
  useEffect(() => {
    const socket = io(API_URL);
    const refresh = () => client.invalidateQueries({ queryKey: ['operations'] });
    socket.on('new_order', refresh); socket.on('order_updated', refresh); socket.on('connect', refresh);
    return () => socket.disconnect();
  }, [client]);
  if (isPending) return <section style={{ marginTop: 28 }}>{controls}<Typography.Paragraph>Đang tải báo cáo vận hành...</Typography.Paragraph></section>;
  if (isError) return <section style={{ marginTop: 28 }}>{controls}Không tải được báo cáo. <Button onClick={() => refetch()}>Thử lại</Button></section>;
  const { customers, menu, tables } = data;
  const total = customers.newcomers + customers.returning + customers.guestOrders;
  const percent = n => total ? `${(n * 100 / total).toFixed(1)}%` : '0%';
  const chart = (content, hasData, height = 300) => <div style={{ height }}>{hasData ? content : <Typography.Paragraph>Chưa có dữ liệu trong kỳ.</Typography.Paragraph>}</div>;
  return <section style={{ marginTop: 28 }}>
    {controls}
    <Typography.Paragraph type="secondary">{new Date(data.from).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} – {new Date(data.to).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })} · {data.orderCount} đơn đủ điều kiện · Dữ liệu database <Button onClick={() => refetch()} loading={isFetching}>Cập nhật</Button></Typography.Paragraph>
    <Row gutter={[24,24]}>
      <Col xs={24} lg={8}><Card title="Tần suất sử dụng bàn">{chart(<Bar data={barData(tables, '#a47551')} options={options} />, tables.some(r => r.count > 0))}<Typography.Text type="secondary">Một đơn tại bàn tính một lượt; không tính mang đi.</Typography.Text></Card></Col>
      <Col xs={24} lg={8}><Card title="Khách mới và khách quay lại">{chart(<Doughnut data={{ labels: ['Lượt khách mới', 'Lượt khách quay lại', 'Lượt vãng lai'], datasets: [{ data: [customers.newcomers,customers.returning,customers.guestOrders], backgroundColor: ['#e8bd8b','#648979','#94a3b8'] }] }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => `${c.label}: ${c.raw} (${percent(c.raw)})` } } } }} />, total > 0)}<Typography.Paragraph>Mới {percent(customers.newcomers)} · Quay lại {percent(customers.returning)} · Vãng lai {percent(customers.guestOrders)}</Typography.Paragraph><Typography.Text type="secondary">Tỷ lệ lượt mua trong kỳ, không phải số người. Theo toàn bộ lịch sử đơn đủ điều kiện: lần đầu của email là mới, lần thứ hai trở đi là quay lại. Đơn thiếu email hoặc Guest là một lượt vãng lai.</Typography.Text></Card></Col>
      <Col xs={24} lg={8}><Card title="Hiệu suất thực đơn">{chart(<Bar data={barData([...menu.top,...menu.bottom].map((r,i)=>({...r,name:`${i < menu.top.length ? 'Bán chạy' : 'Bán chậm'}: ${r.name}`})), [...menu.top.map(()=>'#648979'),...menu.bottom.map(()=>'#e8bd8b')])} options={menuOptions} />, data.orderCount > 0 && menu.top.length > 0, 420)}<Typography.Text type="secondary">Xanh: Top 5 bán chạy · Vàng: Top 5 bán chậm, gồm món chưa bán. Tính theo số ly. {menu.unmatchedItems > 0 ? `${menu.unmatchedItems} dòng món cũ không khớp thực đơn được loại khỏi xếp hạng.` : ''}</Typography.Text></Card></Col>
    </Row>
  </section>;
}

