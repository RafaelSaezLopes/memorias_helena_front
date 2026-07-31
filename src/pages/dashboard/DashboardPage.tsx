import { CalendarOutlined, FileDoneOutlined, MedicineBoxOutlined, PictureOutlined } from '@ant-design/icons';
import { Card, Col, List, Progress, Row, Space, Statistic, Tag, Timeline, Typography } from 'antd';
import dayjs from 'dayjs';
import { albums, exams, medications } from '../../mocks/data';
import { PageHeader } from '../../components/PageHeader';

export default function DashboardPage() {
  return (
    <>
      <PageHeader title="Olá, Rafael 👋" subtitle="Veja um resumo das informações da Helena." />
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="Álbuns" value={albums.length} prefix={<PictureOutlined />} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="Exames cadastrados" value={exams.length} prefix={<FileDoneOutlined />} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="Medicamentos" value={medications.length} prefix={<MedicineBoxOutlined />} /></Card></Col>
        <Col xs={24} sm={12} xl={6}><Card><Statistic title="Próximo compromisso" value="05/08" prefix={<CalendarOutlined />} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={15}>
          <Card title="Linha do tempo recente">
            <Timeline items={[
              { children: <><strong>Cintilografia renal avaliada</strong><div>13 de julho de 2026</div></> },
              { children: <><strong>Aniversário de 4 anos</strong><div>19 de julho de 2026</div></> },
              { children: <><strong>Ultrassom agendado</strong><div>05 de agosto de 2026</div></> },
            ]} />
          </Card>
        </Col>
        <Col xs={24} lg={9}>
          <Card title="Cadastro da Helena">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Typography.Text>Perfil preenchido</Typography.Text>
              <Progress percent={82} />
              <Typography.Text type="secondary">Complete documentos, contatos de emergência e vacinas.</Typography.Text>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}><Card title="Últimos exames"><List dataSource={exams.slice(0,3)} renderItem={(item) => <List.Item><List.Item.Meta title={item.name} description={`${item.specialty} • ${item.performedAt ? dayjs(item.performedAt).format('DD/MM/YYYY') : 'Sem data'}`} /><Tag>{item.status}</Tag></List.Item>} /></Card></Col>
        <Col xs={24} lg={12}><Card title="Fotos recentes"><List dataSource={albums} renderItem={(item) => <List.Item><List.Item.Meta avatar={<img src={item.coverUrl} className="mini-cover" />} title={item.title} description={`${item.photoCount} fotos`} /></List.Item>} /></Card></Col>
      </Row>
    </>
  );
}
