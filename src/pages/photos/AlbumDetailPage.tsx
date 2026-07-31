import { ArrowLeftOutlined, DeleteOutlined, EyeOutlined, StarOutlined, UploadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, Empty, Image, Modal, Popconfirm, Progress, Row, Space, Spin, Typography, Upload, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/PageHeader';
import { albumsService, type AlbumDetailApi, type PhotoApi } from '../../services/albumsService';

export default function AlbumDetailPage() {
  const { albumId = '' } = useParams();
  const navigate = useNavigate();
  const childId = localStorage.getItem('child_id') ?? '';
  const [album, setAlbum] = useState<AlbumDetailApi | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ src: string; title: string } | null>(null);
  const [urls, setUrls] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      setAlbum(await albumsService.get(albumId));
    } catch (e: any) {
      setError(e.response?.data?.message ?? 'Não foi possível abrir o álbum.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [albumId]);

  useEffect(() => {
    let active = true;
    const created: string[] = [];

    async function loadImages() {
      if (!album) return;
      const pairs = await Promise.all(album.photos.map(async (photo) => {
        try {
          const blob = await albumsService.getFileBlob(photo.fileId);
          const url = URL.createObjectURL(blob);
          created.push(url);
          return [photo.id, url] as const;
        } catch {
          return [photo.id, ''] as const;
        }
      }));
      if (active) setUrls(Object.fromEntries(pairs));
    }

    void loadImages();
    return () => {
      active = false;
      created.forEach(URL.revokeObjectURL);
    };
  }, [album]);

  const uploadSingle = async (file: File) => {
    if (!album) return;
    if (!file.type.startsWith('image/')) {
      message.warning(`${file.name} não é uma imagem.`);
      return;
    }

    setUploading(true);
    setProgress(20);
    try {
      const stored = await albumsService.uploadFile(childId, album.id, file);
      setProgress(70);
      await albumsService.addPhoto(album.id, {
        fileId: stored.id,
        takenAt: new Date(file.lastModified || Date.now()).toISOString(),
        caption: file.name.replace(/\.[^/.]+$/, ''),
      });
      setProgress(100);
      message.success(`${file.name} foi salva no álbum.`);
      await load();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? `Falha ao enviar ${file.name}.`);
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const uploadProps = {
    multiple: true,
    accept: 'image/*',
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }: any) => {
      try {
        await uploadSingle(file as File);
        onSuccess?.({});
      } catch (error) {
        onError?.(error as Error);
      }
    },
  };

  const removePhoto = async (photo: PhotoApi) => {
    try {
      await albumsService.deletePhoto(albumId, photo.id);
      message.success('Foto removida do álbum.');
      await load();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Não foi possível remover a foto.');
    }
  };

  const setCover = async (photo: PhotoApi) => {
    try {
      await albumsService.setCover(albumId, photo.fileId);
      message.success('Capa do álbum atualizada.');
      await load();
    } catch (e: any) {
      message.error(e.response?.data?.message ?? 'Não foi possível alterar a capa.');
    }
  };



  return (
    <>
      <PageHeader
        title={album?.title ?? 'Álbum'}
        subtitle={album ? `${dayjs(album.eventDate).format('DD [de] MMMM [de] YYYY')}${album.location ? ` • ${album.location}` : ''}` : 'Carregando fotos...'}
      />
      <Space style={{ marginBottom: 16 }} wrap>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/fotos')}>Voltar aos álbuns</Button>
        <Upload {...uploadProps}>
          <Button type="primary" icon={<UploadOutlined />} loading={uploading}>Adicionar fotos</Button>
        </Upload>
      </Space>

      {uploading && <Card style={{ marginBottom: 16 }}><Typography.Text>Enviando e salvando as fotos...</Typography.Text><Progress percent={progress} /></Card>}
      {error && <Alert type="error" showIcon message={error} action={<Button onClick={load}>Tentar novamente</Button>} style={{ marginBottom: 16 }} />}

      <Spin spinning={loading}>
        {album && album.photos.length === 0 ? (
          <Card><Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Este álbum ainda não possui fotos."><Upload {...uploadProps}><Button type="primary" icon={<UploadOutlined />}>Enviar primeiras fotos</Button></Upload></Empty></Card>
        ) : (
          <Row gutter={[16, 16]}>
            {album?.photos.map((photo) => (
              <Col xs={24} sm={12} md={8} xl={6} key={photo.id}>
                <Card
                  hoverable
                  className="photo-card"
                  cover={urls[photo.id] ? <img src={urls[photo.id]} alt={photo.caption || photo.originalName} className="photo-grid-image" onClick={() => setPreview({ src: urls[photo.id], title: photo.caption || photo.originalName })} /> : <div className="photo-grid-placeholder"><Spin /></div>}
                  actions={[
                    <Button type="text" icon={<EyeOutlined />} onClick={() => urls[photo.id] && setPreview({ src: urls[photo.id], title: photo.caption || photo.originalName })}>Ver</Button>,
                    <Button type="text" icon={<StarOutlined />} onClick={() => setCover(photo)}>Capa</Button>,
                    <Popconfirm title="Remover esta foto?" onConfirm={() => removePhoto(photo)} okText="Remover" cancelText="Cancelar"><Button danger type="text" icon={<DeleteOutlined />}>Remover</Button></Popconfirm>,
                  ]}
                >
                  <Typography.Text strong ellipsis>{photo.caption || photo.originalName}</Typography.Text><br />
                  <Typography.Text type="secondary">{dayjs(photo.takenAt).format('DD/MM/YYYY HH:mm')}</Typography.Text>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal open={Boolean(preview)} footer={null} onCancel={() => setPreview(null)} title={preview?.title} width="min(1000px, 92vw)" destroyOnHidden>
        {preview && <Image src={preview.src} alt={preview.title} width="100%" preview={false} />}
      </Modal>
    </>
  );
}
