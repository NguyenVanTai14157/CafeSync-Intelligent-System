import { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Typography, Spin } from "antd";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  DollarOutlined,
  CalendarOutlined,
  LineChartOutlined,
} from "@ant-design/icons";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title as ChartTitle,
  Tooltip,
  Legend,
} from "chart.js";

import API_URL from "../config";

ChartJS.register(CategoryScale, LinearScale, BarElement, ChartTitle, Tooltip, Legend);

const { Title } = Typography;

const RevenueReportPage = () => {
  const [loading, setLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      axios.get(`${API_URL}/api/reports/total`),
      axios.get(`${API_URL}/api/reports/today`),
      axios.get(`${API_URL}/api/reports/month`),
      axios.get(`${API_URL}/api/reports/chart/week`),
    ])
      .then(([total, today, month, chart]) => {
        setTotalRevenue(total.data.totalRevenue);
        setTodayRevenue(today.data.todayRevenue);
        setMonthRevenue(month.data.monthRevenue);
        setChartData(chart.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const barData = {
    labels: chartData.map((d) => d.date),
    datasets: [
      {
        label: "Doanh thu (VND)",
        data: chartData.map((d) => d.revenue),
        backgroundColor: "#1677ff",
      },
    ],
  };

  return (
    <div>
      <Title level={3}>📊 Báo cáo doanh thu</Title>
      {loading ? (
        <Spin />
      ) : (
        <>
          <Row gutter={24} style={{ marginBottom: 32 }}>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title="Tổng doanh thu"
                  value={totalRevenue}
                  prefix={<DollarOutlined />}
                  valueStyle={{ color: "#16a34a" }}
                  formatter={v => v.toLocaleString("vi-VN") + " VND"}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title="Doanh thu hôm nay"
                  value={todayRevenue}
                  prefix={<CalendarOutlined />}
                  valueStyle={{ color: "#f59e42" }}
                  formatter={v => v.toLocaleString("vi-VN") + " VND"}
                />
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card>
                <Statistic
                  title="Doanh thu tháng này"
                  value={monthRevenue}
                  prefix={<LineChartOutlined />}
                  valueStyle={{ color: "#1677ff" }}
                  formatter={v => v.toLocaleString("vi-VN") + " VND"}
                />
              </Card>
            </Col>
          </Row>
          <Card title="Biểu đồ doanh thu 7 ngày gần nhất">
            <Bar data={barData} />
          </Card>
        </>
      )}
    </div>
  );
};

export default RevenueReportPage;