import {
  CalendarOutlined,
  FileDoneOutlined,
  MedicineBoxOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Card,
  Col,
  Empty,
  List,
  Row,
  Skeleton,
  Statistic,
  Tag,
  Timeline,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { AuthenticatedImage } from '../../components/AuthenticatedImage';
import { useAuth } from '../../contexts/AuthContext';
import { albumsService, type AlbumApi } from '../../services/albumsService';
import { examsService, type ExamApi } from '../../services/examsService';
import { medicationsService, type MedicationApi } from '../../services/medicationsService';

type TimelineItem = {
  date: string;
  title: string;
  description?: string;
};

const statusLabels: Record<ExamApi['status'], string> = {
  Requested: 'Solicitado',
  Scheduled: 'Agendado',
  Performed: 'Realizado',
  ResultAvailable: 'Resultado disponível',
  Reviewed: 'Avaliado',
};

export default function DashboardPage() {
  const { user, child } = useAuth();
  const [albums, setAlbums] = useState<AlbumApi[]>([]);
  const [exams, setExams] = useState<ExamApi[]>([]);
  const [medications, setMedications] = useState<MedicationApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!child?.id) return;

    let active = true;
    setLoading(true);
    setLoadError(false);

    Promise.all([
      albumsService.list(child.id),
      examsService.list(child.id),
      medicationsService.list(child.id),
    ])
      .then(([albumItems, examItems, medicationItems]) => {
        if (!active) return;
        setAlbums(albumItems);
        setExams(examItems);
        setMedications(medicationItems);
      })
      .catch(() => {
        if (!active) return;
        setLoadError(true);
        message.error('Não foi possível carregar o resumo do banco de dados.');
      })
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [child?.id]);

  const upcomingExam = useMemo(
    () => exams
      .filter((exam) => exam.scheduledAt && dayjs(exam.scheduledAt).isAfter(dayjs().subtract(1, 'minute')))
      .sort((a, b) => dayjs(a.scheduledAt).valueOf() - dayjs(b.scheduledAt).valueOf())[0],
    [exams],
  );

  const recentExams = useMemo(
    () => [...exams]
      .sort((a, b) => {
        const dateA = a.performedAt ?? a.resultReceivedAt ?? a.scheduledAt ?? a.requestedAt ?? '';
        const dateB = b.performedAt ?? b.resultReceivedAt ?? b.scheduledAt ?? b.requestedAt ?? '';
        return dayjs(dateB).valueOf() - dayjs(dateA).valueOf();
      })
      .slice(0, 3),
    [exams],
  );

  const recentAlbums = useMemo(
    () => [...albums].sort((a, b) => dayjs(b.eventDate).valueOf() - dayjs(a.eventDate).valueOf()).slice(0, 3),
    [albums],
  );

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    exams.forEach((exam) => {
      const date = exam.performedAt ?? exam.resultReceivedAt ?? exam.scheduledAt ?? exam.requestedAt;
      if (date) items.push({ date, title: exam.name, description: statusLabels[exam.status] });
    });

    albums.forEach((album) => {
      if (album.eventDate) items.push({ date: album.eventDate, title: album.title, description: 'Álbum de fotos' });
    });

    medications.forEach((medication) => {
      if (medication.startDate) {
        items.push({
          date: medication.startDate,
          title: medication.name,
          description: medication.inUse ? 'Medicamento em uso' : 'Medicamento registrado',
        });
      }
    });

    return items
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
      .slice(0, 5);
  }, [albums, exams, medications]);

  return (
    <>
      <PageHeader
        title={`Olá, ${user?.name?.split(' ')[0] ?? 'usuário'} 👋`}
        subtitle={`Veja um resumo das informações de ${child?.fullName ?? 'sua filha'}.`}
      />

      {loadError && (
        <Alert
          type="error"
          showIcon
          message="Não foi possível consultar o banco de dados"
          description="Confira se a API está disponível e tente atualizar a página."
          style={{ marginBottom: 16 }}
        />
      )}

      <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} xl={6}>
            <Card><Statistic title="Álbuns" value={albums.length} prefix={<PictureOutlined />} /></Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card><Statistic title="Exames cadastrados" value={exams.length} prefix={<FileDoneOutlined />} /></Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card><Statistic title="Medicamentos em uso" value={medications.filter((item) => item.inUse).length} prefix={<MedicineBoxOutlined />} /></Card>
          </Col>
          <Col xs={24} sm={12} xl={6}>
            <Card>
              <Statistic
                title="Próximo exame"
                value={upcomingExam?.scheduledAt ? dayjs(upcomingExam.scheduledAt).format('DD/MM') : 'Nenhum'}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={15}>
            <Card title="Linha do tempo recente">
              {timelineItems.length ? (
                <Timeline
                  items={timelineItems.map((item) => ({
                    children: (
                      <>
                        <strong>{item.title}</strong>
                        <div>{dayjs(item.date).format('DD/MM/YYYY')}{item.description ? ` • ${item.description}` : ''}</div>
                      </>
                    ),
                  }))}
                />
              ) : <Empty description="Nenhum registro encontrado no banco" />}
            </Card>
          </Col>
          <Col xs={24} lg={9}>
            <Card title="Próximo compromisso">
              {upcomingExam ? (
                <>
                  <Typography.Title level={5} style={{ marginTop: 0 }}>{upcomingExam.name}</Typography.Title>
                  <Typography.Paragraph>
                    {dayjs(upcomingExam.scheduledAt).format('DD/MM/YYYY [às] HH:mm')}
                  </Typography.Paragraph>
                  <Tag color="blue">{statusLabels[upcomingExam.status]}</Tag>
                </>
              ) : <Empty description="Nenhum exame agendado" />}
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} lg={12}>
            <Card title="Últimos exames">
              {recentExams.length ? (
                <List
                  dataSource={recentExams}
                  renderItem={(item) => {
                    const date = item.performedAt ?? item.resultReceivedAt ?? item.scheduledAt ?? item.requestedAt;
                    return (
                      <List.Item>
                        <List.Item.Meta
                          title={item.name}
                          description={`${item.specialty?.name ?? 'Sem especialidade'} • ${date ? dayjs(date).format('DD/MM/YYYY') : 'Sem data'}`}
                        />
                        <Tag>{statusLabels[item.status]}</Tag>
                      </List.Item>
                    );
                  }}
                />
              ) : <Empty description="Nenhum exame cadastrado" />}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card title="Álbuns recentes">
              {recentAlbums.length ? (
                <List
                  dataSource={recentAlbums}
                  renderItem={(item) => (
                    <List.Item>
                      <List.Item.Meta
                        avatar={item.coverFileId ? (
                          <AuthenticatedImage fileId={item.coverFileId} alt={item.title} className="mini-cover" />
                        ) : undefined}
                        title={item.title}
                        description={`${item.photoCount} foto${item.photoCount === 1 ? '' : 's'} • ${dayjs(item.eventDate).format('DD/MM/YYYY')}`}
                      />
                    </List.Item>
                  )}
                />
              ) : <Empty description="Nenhum álbum cadastrado" />}
            </Card>
          </Col>
        </Row>
      </Skeleton>
    </>
  );
}
