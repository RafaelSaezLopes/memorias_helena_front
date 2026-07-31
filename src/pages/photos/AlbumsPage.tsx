import { CameraOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, DatePicker, Empty, Form, Input, Modal, Popconfirm, Row, Select, Spin, Tag, Typography, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { AuthenticatedImage } from '../../components/AuthenticatedImage';
import { albumsService, type AlbumApi } from '../../services/albumsService';


export default function AlbumsPage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<AlbumApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const childId = localStorage.getItem('child_id') ?? '';

  const load = async () => {
    if (!childId) {
      setError('Criança não identificada. Faça login novamente.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError('');
      setAlbums(await albumsService.list(childId));
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Não foi possível carregar os álbuns.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const created = await albumsService.create({
        childId,
        title: values.title,
        eventDate: values.date.format('YYYY-MM-DD'),
        eventType: values.category,
        location: values.location,
        description: values.description,
        coverFileId: null,
      });
      setAlbums((current) => [created, ...current]);
      setOpen(false);
      form.resetFields();
      message.success('Álbum criado e salvo no banco.');
    } catch (e: any) {
      if (e?.errorFields) return;
      message.error(e.response?.data?.message ?? 'Não foi possível criar o álbum.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await albumsService.remove(id);
      setAlbums((current) => current.filter((album) => album.id !== id));
      message.success('Álbum excluído.');
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Não foi possível excluir o álbum.');
    }
  };

  return (
    <>
      <PageHeader title="Fotos e momentos" subtitle="Organize as lembranças por data e comemoração." action={() => setOpen(true)} actionLabel="Novo álbum" />
      {error && <Alert type="error" showIcon message={error} action={<Button onClick={load}>Tentar novamente</Button>} style={{ marginBottom: 16 }} />}
      <Spin spinning={loading}>
        {!loading && albums.length === 0 ? (
          <Card><Empty description="Nenhum álbum criado"><Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>Criar primeiro álbum</Button></Empty></Card>
        ) : (
          <Row gutter={[18, 18]}>
            {albums.map((album) => (
              <Col xs={24} sm={12} xl={8} key={album.id}>
                <Card
                  hoverable
                  cover={<AuthenticatedImage fileId={album.coverFileId} alt={album.title} className="album-cover" onClick={() => navigate(`/fotos/${album.id}`)} />}
                  actions={[
                    <Button type="link" icon={<CameraOutlined />} onClick={() => navigate(`/fotos/${album.id}`)}>Abrir álbum</Button>,
                    <Popconfirm title="Excluir este álbum?" description="As referências das fotos também serão removidas." onConfirm={() => remove(album.id)} okText="Excluir" cancelText="Cancelar">
                      <Button type="text" danger icon={<DeleteOutlined />}>Excluir</Button>
                    </Popconfirm>,
                  ]}
                >
                  <Tag color="purple">{album.eventType || 'Momentos'}</Tag>
                  <Typography.Title level={4}>{album.title}</Typography.Title>
                  <Typography.Text type="secondary">{dayjs(album.eventDate).format('DD [de] MMMM [de] YYYY')} • {album.photoCount} foto{album.photoCount === 1 ? '' : 's'}</Typography.Text>
                  {album.location && <Typography.Paragraph type="secondary">{album.location}</Typography.Paragraph>}
                  {album.description && <Typography.Paragraph ellipsis={{ rows: 2 }}>{album.description}</Typography.Paragraph>}
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal title="Criar álbum" open={open} onCancel={() => setOpen(false)} onOk={save} okText="Criar" confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" initialValues={{ date: dayjs() }}>
          <Form.Item label="Título" name="title" rules={[{ required: true, message: 'Informe o título.' }]}><Input /></Form.Item>
          <Form.Item label="Data" name="date" rules={[{ required: true, message: 'Informe a data.' }]}><DatePicker style={{ width: '100%' }} /></Form.Item>
          <Form.Item label="Categoria" name="category"><Select allowClear options={['Aniversário', 'Escola', 'Passeio', 'Família', 'Viagem', 'Dia a dia'].map(value => ({ value, label: value }))} /></Form.Item>
          <Form.Item label="Local" name="location"><Input /></Form.Item>
          <Form.Item label="Descrição" name="description"><Input.TextArea rows={3} /></Form.Item>
        </Form>
      </Modal>
    </>
  );
}
