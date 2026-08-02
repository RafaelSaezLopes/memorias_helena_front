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
import { useNavigate } from 'react-router-dom';
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
  route: string;
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
  const navigate = useNavigate();

  const can = (module: string) =>
    user?.role === 'ADMIN' || user?.permissions?.includes(module) === true;

  const canPhotos = can('photos');
  const canExams = can('exams');
  const canMedications = can('medications');

  const [albums, setAlbums] = useState<AlbumApi[]>([]);
  const [exams, setExams] = useState<ExamApi[]>([]);
  const [medications, setMedications] = useState<MedicationApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    if (!child?.id) {
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    setLoadError(false);

    const requests: Promise<void>[] = [];

    if (canPhotos) {
      requests.push(
        albumsService.list(child.id).then((items) => {
          if (active) setAlbums(items);
        }),
      );
    } else {
      setAlbums([]);
    }

    if (canExams) {
      requests.push(
        examsService.list(child.id).then((items) => {
          if (active) setExams(items);
        }),
      );
    } else {
      setExams([]);
    }

    if (canMedications) {
      requests.push(
        medicationsService.list(child.id).then((items) => {
          if (active) setMedications(items);
        }),
      );
    } else {
      setMedications([]);
    }

    Promise.allSettled(requests)
      .then((results) => {
        if (!active) return;
        const failed = results.some((result) => result.status === 'rejected');
        setLoadError(failed);
        if (failed) {
          message.error('Algumas informações do painel não puderam ser carregadas.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [child?.id, canPhotos, canExams, canMedications]);

  const upcomingExam = useMemo(
    () =>
      exams
        .filter(
          (exam) =>
            exam.scheduledAt &&
            dayjs(exam.scheduledAt).isAfter(dayjs().subtract(1, 'minute')),
        )
        .sort(
          (a, b) =>
            dayjs(a.scheduledAt).valueOf() -
            dayjs(b.scheduledAt).valueOf(),
        )[0],
    [exams],
  );

  const recentExams = useMemo(
    () =>
      [...exams]
        .sort((a, b) => {
          const dateA =
            a.performedAt ??
            a.resultReceivedAt ??
            a.scheduledAt ??
            a.requestedAt ??
            '';
          const dateB =
            b.performedAt ??
            b.resultReceivedAt ??
            b.scheduledAt ??
            b.requestedAt ??
            '';
          return dayjs(dateB).valueOf() - dayjs(dateA).valueOf();
        })
        .slice(0, 3),
    [exams],
  );

  const recentAlbums = useMemo(
    () =>
      [...albums]
        .sort(
          (a, b) =>
            dayjs(b.eventDate).valueOf() - dayjs(a.eventDate).valueOf(),
        )
        .slice(0, 3),
    [albums],
  );

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    if (canExams) {
      exams.forEach((exam) => {
        const date =
          exam.performedAt ??
          exam.resultReceivedAt ??
          exam.scheduledAt ??
          exam.requestedAt;

        if (date) {
          items.push({
            date,
            title: exam.name,
            description: statusLabels[exam.status],
            route: '/saude/exames',
          });
        }
      });
    }

    if (canPhotos) {
      albums.forEach((album) => {
        if (album.eventDate) {
          items.push({
            date: album.eventDate,
            title: album.title,
            description: 'Álbum de fotos',
            route: `/fotos/${album.id}`,
          });
        }
      });
    }

    if (canMedications) {
      medications.forEach((medication) => {
        if (medication.startDate) {
          items.push({
            date: medication.startDate,
            title: medication.name,
            description: medication.inUse
              ? 'Medicamento em uso'
              : 'Medicamento registrado',
            route: '/saude/medicamentos',
          });
        }
      });
    }

    return items
      .sort((a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf())
      .slice(0, 5);
  }, [
    albums,
    exams,
    medications,
    canPhotos,
    canExams,
    canMedications,
  ]);

  const visibleModuleCount =
    Number(canPhotos) + Number(canExams) + Number(canMedications);

  return (
    <>
      <PageHeader
        title={`Olá, ${user?.name?.split(' ')[0] ?? 'usuário'} 👋`}
        subtitle={`Veja um resumo das informações de ${
          child?.fullName ?? 'sua filha'
        } que você tem permissão para acessar.`}
      />

      {loadError && (
        <Alert
          type="warning"
          showIcon
          message="Algumas informações não puderam ser consultadas"
          description="Os demais módulos disponíveis continuam acessíveis."
          style={{ marginBottom: 16 }}
        />
      )}

      <Skeleton loading={loading} active paragraph={{ rows: 8 }}>
        {visibleModuleCount === 0 ? (
          <Card>
            <Empty description="Seu perfil ainda não possui acesso aos módulos do painel." />
          </Card>
        ) : (
          <>
            <Row gutter={[16, 16]}>
              {canPhotos && (
                <Col xs={24} sm={12} xl={6}>
                  <Card
                    hoverable
                    role="link"
                    tabIndex={0}
                    aria-label="Abrir álbuns"
                    onClick={() => navigate('/fotos')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        navigate('/fotos');
                      }
                    }}
                  >
                    <Statistic
                      title="Álbuns"
                      value={albums.length}
                      prefix={<PictureOutlined />}
                    />
                  </Card>
                </Col>
              )}

              {canExams && (
                <>
                  <Col xs={24} sm={12} xl={6}>
                    <Card
                      hoverable
                      role="link"
                      tabIndex={0}
                      aria-label="Abrir exames"
                      onClick={() => navigate('/saude/exames')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          navigate('/saude/exames');
                        }
                      }}
                    >
                      <Statistic
                        title="Exames cadastrados"
                        value={exams.length}
                        prefix={<FileDoneOutlined />}
                      />
                    </Card>
                  </Col>

                  <Col xs={24} sm={12} xl={6}>
                    <Card
                      hoverable
                      role="link"
                      tabIndex={0}
                      aria-label="Abrir próximo exame"
                      onClick={() => navigate('/saude/exames')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          navigate('/saude/exames');
                        }
                      }}
                    >
                      <Statistic
                        title="Próximo exame"
                        value={
                          upcomingExam?.scheduledAt
                            ? dayjs(upcomingExam.scheduledAt).format('DD/MM')
                            : 'Nenhum'
                        }
                        prefix={<CalendarOutlined />}
                      />
                    </Card>
                  </Col>
                </>
              )}

              {canMedications && (
                <Col xs={24} sm={12} xl={6}>
                  <Card
                    hoverable
                    role="link"
                    tabIndex={0}
                    aria-label="Abrir medicamentos"
                    onClick={() => navigate('/saude/medicamentos')}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        navigate('/saude/medicamentos');
                      }
                    }}
                  >
                    <Statistic
                      title="Medicamentos em uso"
                      value={
                        medications.filter((item) => item.inUse).length
                      }
                      prefix={<MedicineBoxOutlined />}
                    />
                  </Card>
                </Col>
              )}
            </Row>

            {timelineItems.length > 0 && (
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col xs={24} lg={canExams ? 15 : 24}>
                  <Card title="Linha do tempo recente">
                    <Timeline
                      items={timelineItems.map((item) => ({
                        children: (
                          <div
                            role="link"
                            tabIndex={0}
                            onClick={() => navigate(item.route)}
                            onKeyDown={(event) => {
                              if (
                                event.key === 'Enter' ||
                                event.key === ' '
                              ) {
                                navigate(item.route);
                              }
                            }}
                            style={{ cursor: 'pointer' }}
                          >
                            <strong>{item.title}</strong>
                            <div>
                              {dayjs(item.date).format('DD/MM/YYYY')}
                              {item.description
                                ? ` • ${item.description}`
                                : ''}
                            </div>
                          </div>
                        ),
                      }))}
                    />
                  </Card>
                </Col>

                {canExams && (
                  <Col xs={24} lg={9}>
                    <Card
                      title="Próximo compromisso"
                      hoverable={Boolean(upcomingExam)}
                      onClick={() =>
                        upcomingExam && navigate('/saude/exames')
                      }
                      style={{
                        cursor: upcomingExam ? 'pointer' : 'default',
                      }}
                    >
                      {upcomingExam ? (
                        <>
                          <Typography.Title
                            level={5}
                            style={{ marginTop: 0 }}
                          >
                            {upcomingExam.name}
                          </Typography.Title>
                          <Typography.Paragraph>
                            {dayjs(upcomingExam.scheduledAt).format(
                              'DD/MM/YYYY [às] HH:mm',
                            )}
                          </Typography.Paragraph>
                          <Tag color="blue">
                            {statusLabels[upcomingExam.status]}
                          </Tag>
                        </>
                      ) : (
                        <Empty description="Nenhum exame agendado" />
                      )}
                    </Card>
                  </Col>
                )}
              </Row>
            )}

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
              {canExams && (
                <Col xs={24} lg={canPhotos ? 12 : 24}>
                  <Card
                    title="Últimos exames"
                    extra={
                      recentExams.length ? (
                        <Typography.Link
                          onClick={() => navigate('/saude/exames')}
                        >
                          Ver todos
                        </Typography.Link>
                      ) : undefined
                    }
                  >
                    {recentExams.length ? (
                      <List
                        dataSource={recentExams}
                        renderItem={(item) => {
                          const date =
                            item.performedAt ??
                            item.resultReceivedAt ??
                            item.scheduledAt ??
                            item.requestedAt;

                          return (
                            <List.Item
                              onClick={() => navigate('/saude/exames')}
                              style={{ cursor: 'pointer' }}
                            >
                              <List.Item.Meta
                                title={item.name}
                                description={`${
                                  item.specialty?.name ??
                                  'Sem especialidade'
                                } • ${
                                  date
                                    ? dayjs(date).format('DD/MM/YYYY')
                                    : 'Sem data'
                                }`}
                              />
                              <Tag>{statusLabels[item.status]}</Tag>
                            </List.Item>
                          );
                        }}
                      />
                    ) : (
                      <Empty description="Nenhum exame cadastrado" />
                    )}
                  </Card>
                </Col>
              )}

              {canPhotos && (
                <Col xs={24} lg={canExams ? 12 : 24}>
                  <Card
                    title="Álbuns recentes"
                    extra={
                      recentAlbums.length ? (
                        <Typography.Link onClick={() => navigate('/fotos')}>
                          Ver todos
                        </Typography.Link>
                      ) : undefined
                    }
                  >
                    {recentAlbums.length ? (
                      <List
                        dataSource={recentAlbums}
                        renderItem={(item) => (
                          <List.Item
                            onClick={() => navigate(`/fotos/${item.id}`)}
                            style={{ cursor: 'pointer' }}
                          >
                            <List.Item.Meta
                              avatar={
                                item.coverFileId ? (
                                  <AuthenticatedImage
                                    fileId={item.coverFileId}
                                    alt={item.title}
                                    className="mini-cover"
                                  />
                                ) : undefined
                              }
                              title={item.title}
                              description={`${item.photoCount} foto${
                                item.photoCount === 1 ? '' : 's'
                              } • ${dayjs(item.eventDate).format(
                                'DD/MM/YYYY',
                              )}`}
                            />
                          </List.Item>
                        )}
                      />
                    ) : (
                      <Empty description="Nenhum álbum cadastrado" />
                    )}
                  </Card>
                </Col>
              )}
            </Row>
          </>
        )}
      </Skeleton>
    </>
  );
}
