import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileUnknownOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Card,
  Form,
  Image,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  deleteDocument,
  downloadDocument,
  getDocumentBlob,
  listDocuments,
  renameDocument,
  uploadDocument,
  type ChildDocument,
} from '../../services/documentsService';

const DOCUMENT_TYPES = [
  'Documento pessoal',
  'Certidão',
  'Carteirinha do plano',
  'Receita',
  'Laudo',
  'Outros',
];

function isImage(document: ChildDocument) {
  return document.contentType?.startsWith('image/');
}

function DocumentThumbnail({ document }: { document: ChildDocument }) {
  const [src, setSrc] = useState<string>();

  useEffect(() => {
    let active = true;
    let objectUrl: string | undefined;

    if (!isImage(document)) return undefined;

    getDocumentBlob(document.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(undefined));

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [document.id, document.contentType]);

  if (isImage(document) && src) {
    return (
      <Image
        src={src}
        alt={document.originalName}
        width={64}
        height={64}
        style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #f0f0f0' }}
        preview={{ mask: <EyeOutlined /> }}
      />
    );
  }

  const iconStyle = {
    width: 64,
    height: 64,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#fafafa',
    border: '1px solid #f0f0f0',
    fontSize: 28,
  } as const;

  if (document.contentType === 'application/pdf') {
    return <div style={iconStyle}><FilePdfOutlined style={{ color: '#cf1322' }} /></div>;
  }

  if (document.contentType?.startsWith('image/')) {
    return <div style={iconStyle}><FileImageOutlined /></div>;
  }

  return <div style={iconStyle}><FileUnknownOutlined /></div>;
}

export default function DocumentsPage() {
  const { child } = useAuth();
  const [items, setItems] = useState<ChildDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('Documento pessoal');
  const [editing, setEditing] = useState<ChildDocument | null>(null);
  const [savingName, setSavingName] = useState(false);
  const [form] = Form.useForm<{ name: string }>();

  const load = async () => {
    if (!child?.id) return;
    setLoading(true);
    try {
      setItems(await listDocuments(child.id));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Erro ao carregar documentos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [child?.id]);

  const upload = async (file: File) => {
    if (!child?.id) return false;
    try {
      await uploadDocument(child.id, file, type);
      message.success('Documento salvo');
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Erro no upload');
    }
    return false;
  };

  const openRename = (document: ChildDocument) => {
    setEditing(document);
    form.setFieldsValue({ name: document.originalName });
  };

  const saveName = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    setSavingName(true);
    try {
      await renameDocument(editing.id, values.name.trim());
      message.success('Nome do documento alterado');
      setEditing(null);
      form.resetFields();
      await load();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Erro ao alterar o nome');
    } finally {
      setSavingName(false);
    }
  };

  const columns = useMemo<ColumnsType<ChildDocument>>(() => [
    {
      title: 'Miniatura',
      key: 'thumbnail',
      width: 100,
      render: (_, document) => <DocumentThumbnail document={document} />,
    },
    {
      title: 'Documento',
      dataIndex: 'originalName',
      render: (value: string, document) => (
        <Space direction="vertical" size={0}>
          <span style={{ fontWeight: 600 }}>{value}</span>
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{document.contentType}</span>
        </Space>
      ),
    },
    {
      title: 'Tipo',
      dataIndex: 'relatedEntityType',
      responsive: ['md'],
      render: (value?: string) => <Tag>{value || 'Documento'}</Tag>,
    },
    {
      title: 'Tamanho',
      dataIndex: 'sizeBytes',
      responsive: ['lg'],
      render: (value: number) => `${(value / 1024 / 1024).toFixed(2)} MB`,
    },
    {
      title: 'Enviado em',
      dataIndex: 'createdAt',
      responsive: ['lg'],
      render: (value: string) => dayjs(value).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 160,
      render: (_, document) => (
        <Space wrap>
          <Tooltip title="Alterar nome">
            <Button icon={<EditOutlined />} onClick={() => openRename(document)} />
          </Tooltip>
          <Tooltip title="Baixar">
            <Button
              icon={<DownloadOutlined />}
              onClick={() => void downloadDocument(document.id, document.originalName)}
            />
          </Tooltip>
          <Popconfirm
            title="Excluir documento?"
            description="O arquivo será removido definitivamente."
            okText="Excluir"
            cancelText="Cancelar"
            onConfirm={async () => {
              await deleteDocument(document.id);
              message.success('Documento excluído');
              await load();
            }}
          >
            <Tooltip title="Excluir">
              <Button danger icon={<DeleteOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ], [items]);

  return (
    <>
      <PageHeader
        title="Documentos"
        subtitle="Certidões, carteirinhas, laudos e outros arquivos da Helena."
        extra={(
          <Space wrap>
            <Select
              value={type}
              onChange={setType}
              style={{ width: 190 }}
              options={DOCUMENT_TYPES.map((item) => ({ value: item, label: item }))}
            />
            <Upload
              beforeUpload={upload}
              showUploadList={false}
              accept=".pdf,.png,.jpg,.jpeg,.webp"
            >
              <Button type="primary" icon={<UploadOutlined />}>Enviar documento</Button>
            </Upload>
          </Space>
        )}
      />

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          columns={columns}
          scroll={{ x: 720 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          locale={{ emptyText: 'Nenhum documento salvo' }}
        />
      </Card>

      <Modal
        title="Alterar nome do documento"
        open={Boolean(editing)}
        okText="Salvar nome"
        cancelText="Cancelar"
        confirmLoading={savingName}
        onOk={() => void saveName()}
        onCancel={() => {
          setEditing(null);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="Nome do documento"
            rules={[
              { required: true, whitespace: true, message: 'Informe o nome do documento' },
              { max: 255, message: 'Use no máximo 255 caracteres' },
            ]}
          >
            <Input placeholder="Ex.: Certidão de nascimento da Helena.jpg" maxLength={255} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
