import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  EyeOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Upload,
  message,
  type UploadFile,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import {
  examsService,
  type ExamApi,
  type ExamInput,
  type ExamStatusApi,
} from '../../services/examsService';
import {
  professionalsService,
  type ProfessionalApi,
  type SpecialtyApi,
} from '../../services/professionalsService';

const statusInfo: Record<ExamStatusApi, { label: string; color: string }> = {
  Requested: { label: 'SOLICITADO', color: 'default' },
  Scheduled: { label: 'AGENDADO', color: 'blue' },
  Performed: { label: 'REALIZADO', color: 'gold' },
  ResultAvailable: { label: 'RESULTADO DISPONÍVEL', color: 'cyan' },
  Reviewed: { label: 'AVALIADO', color: 'green' },
};

const statusOptions = Object.entries(statusInfo).map(([value, item]) => ({
  value,
  label: item.label,
}));

function cleanText(value?: string | null) {
  const text = value?.trim();
  return text ? text : null;
}

function toIso(value?: Dayjs | null) {
  return value ? value.toISOString() : null;
}

function formatDate(value?: string | null) {
  return value ? dayjs(value).format('DD/MM/YYYY') : '—';
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ExamsPage() {
  const { child } = useAuth();
  const [items, setItems] = useState<ExamApi[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalApi[]>([]);
  const [specialties, setSpecialties] = useState<SpecialtyApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState<ExamApi | null>(null);
  const [selected, setSelected] = useState<ExamApi | null>(null);
  const [newFiles, setNewFiles] = useState<UploadFile[]>([]);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    if (!child?.id) return;
    setLoading(true);
    setError(null);
    try {
      const [examItems, professionalItems, specialtyItems] = await Promise.all([
        examsService.list(child.id),
        professionalsService.list(child.id),
        professionalsService.listSpecialties(),
      ]);
      setItems(examItems);
      setProfessionals(professionalItems);
      setSpecialties(specialtyItems);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? err?.message ?? 'Não foi possível carregar os exames.');
    } finally {
      setLoading(false);
    }
  }, [child?.id]);

  useEffect(() => {
    void load();
  }, [load]);

  const specialtyOptions = useMemo(
    () => specialties.map((item) => ({ label: item.name, value: item.id })),
    [specialties],
  );

  const professionalOptions = useMemo(
    () => professionals.map((item) => ({ label: item.name, value: item.id })),
    [professionals],
  );

  const start = (item?: ExamApi) => {
    const exam = item ?? null;
    setEditing(exam);
    setNewFiles([]);
    form.resetFields();

    if (exam) {
      form.setFieldsValue({
        name: exam.name,
        category: exam.category,
        specialtyId: exam.specialtyId,
        professionalId: exam.professionalId,
        requestedAt: exam.requestedAt ? dayjs(exam.requestedAt) : null,
        scheduledAt: exam.scheduledAt ? dayjs(exam.scheduledAt) : null,
        performedAt: exam.performedAt ? dayjs(exam.performedAt) : null,
        resultReceivedAt: exam.resultReceivedAt ? dayjs(exam.resultReceivedAt) : null,
        status: exam.status,
        institution: exam.institution,
        resultSummary: exam.resultSummary,
        medicalEvaluation: exam.medicalEvaluation,
        notes: exam.notes,
      });
    } else {
      form.setFieldsValue({ status: 'Requested' });
    }
    setOpen(true);
  };

  const save = async () => {
    if (!child?.id) return;
    const values = await form.validateFields();

    const input: ExamInput = {
      childId: child.id,
      professionalId: values.professionalId ?? null,
      specialtyId: values.specialtyId ?? null,
      name: values.name.trim(),
      category: cleanText(values.category),
      requestedAt: toIso(values.requestedAt),
      scheduledAt: toIso(values.scheduledAt),
      performedAt: toIso(values.performedAt),
      resultReceivedAt: toIso(values.resultReceivedAt),
      institution: cleanText(values.institution),
      resultSummary: cleanText(values.resultSummary),
      medicalEvaluation: cleanText(values.medicalEvaluation),
      notes: cleanText(values.notes),
      status: values.status,
    };

    setSaving(true);
    try {
      const saved = editing
        ? await examsService.update(editing.id, input)
        : await examsService.create(input);

      const files = newFiles
        .map((item) => item.originFileObj)
        .filter((item): item is File => item instanceof File);

      for (const file of files) {
        await examsService.uploadFile(child.id, saved.id, file);
      }

      message.success(editing ? 'Exame atualizado no banco de dados.' : 'Exame cadastrado no banco de dados.');
      setOpen(false);
      setEditing(null);
      setNewFiles([]);
      form.resetFields();
      await load();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível salvar o exame.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await examsService.remove(id);
      message.success('Exame excluído.');
      await load();
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível excluir o exame.');
    }
  };

  const openDetails = async (item: ExamApi) => {
    try {
      const detail = await examsService.get(item.id);
      setSelected(detail);
      setDetailsOpen(true);
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível carregar os detalhes.');
    }
  };

  const openFile = async (fileId: string, fileName: string, download = false) => {
    try {
      const blob = await examsService.getFileBlob(fileId);
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível abrir o arquivo.');
    }
  };

  const deleteFile = async (examId: string, fileId: string) => {
    try {
      await examsService.deleteFile(examId, fileId);
      const detail = await examsService.get(examId);
      setSelected(detail);
      await load();
      message.success('Arquivo removido.');
    } catch (err: any) {
      message.error(err?.response?.data?.message ?? err?.message ?? 'Não foi possível remover o arquivo.');
    }
  };

  return (
    <>
      <PageHeader
        title="Exames"
        subtitle="Acompanhe solicitações, resultados e documentos médicos."
        action={() => start()}
        actionLabel="Novo exame"
      />

      {error && (
        <Alert
          type="error"
          showIcon
          message={error}
          action={<Button onClick={() => void load()}>Tentar novamente</Button>}
          style={{ marginBottom: 16 }}
        />
      )}

      <Card>
        <Table
          rowKey="id"
          loading={loading}
          dataSource={items}
          locale={{ emptyText: 'Nenhum exame cadastrado.' }}
          columns={[
            { title: 'Exame', dataIndex: 'name' },
            { title: 'Especialidade', render: (_, record) => record.specialty?.name ?? '—' },
            { title: 'Profissional', render: (_, record) => record.professional?.name ?? '—' },
            {
              title: 'Data',
              render: (_, record) => formatDate(record.performedAt ?? record.scheduledAt ?? record.requestedAt),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              render: (value: ExamStatusApi) => <Tag color={statusInfo[value].color}>{statusInfo[value].label}</Tag>,
            },
            {
              title: 'Arquivo',
              render: (_, record) => record.files[0]?.originalName ?? '—',
            },
            {
              title: 'Ações',
              width: 205,
              render: (_, record) => (
                <Space>
                  <Button icon={<EyeOutlined />} onClick={() => void openDetails(record)}>Detalhes</Button>
                  <Tooltip title="Editar">
                    <Button icon={<EditOutlined />} onClick={() => start(record)} />
                  </Tooltip>
                  <Popconfirm
                    title="Excluir exame?"
                    description="Os arquivos vinculados também serão excluídos."
                    okText="Excluir"
                    cancelText="Cancelar"
                    okButtonProps={{ danger: true }}
                    onConfirm={() => void remove(record.id)}
                  >
                    <Tooltip title="Excluir">
                      <Button danger icon={<DeleteOutlined />} />
                    </Tooltip>
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
          scroll={{ x: 1100 }}
        />
      </Card>

      <Modal
        title={editing ? 'Editar exame' : 'Novo exame'}
        open={open}
        onCancel={() => setOpen(false)}
        onOk={() => void save()}
        okText="Salvar"
        cancelText="Cancelar"
        confirmLoading={saving}
        width={820}
        destroyOnHidden
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col xs={24} md={16}>
              <Form.Item label="Nome do exame" name="name" rules={[{ required: true, message: 'Informe o nome do exame.' }]}>
                <Input placeholder="Ex.: Cintilografia renal" />
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item label="Categoria" name="category">
                <Input placeholder="Ex.: Imagem, laboratório" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Especialidade" name="specialtyId">
                <Select allowClear showSearch optionFilterProp="label" options={specialtyOptions} placeholder="Selecione" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Profissional" name="professionalId">
                <Select allowClear showSearch optionFilterProp="label" options={professionalOptions} placeholder="Selecione" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item label="Status" name="status" rules={[{ required: true }]}>
                <Select options={statusOptions} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item label="Instituição ou laboratório" name="institution">
                <Input placeholder="Ex.: Hospital Infantil" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={12} md={6}><Form.Item label="Solicitado em" name="requestedAt"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Agendado para" name="scheduledAt"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Realizado em" name="performedAt"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
            <Col xs={12} md={6}><Form.Item label="Resultado recebido" name="resultReceivedAt"><DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" /></Form.Item></Col>
          </Row>

          <Form.Item label="Resumo do resultado" name="resultSummary">
            <Input.TextArea rows={3} placeholder="Resumo das informações principais do resultado" />
          </Form.Item>
          <Form.Item label="Avaliação médica" name="medicalEvaluation">
            <Input.TextArea rows={3} placeholder="Avaliação e orientação informadas pelo profissional" />
          </Form.Item>
          <Form.Item label="Observações" name="notes">
            <Input.TextArea rows={2} />
          </Form.Item>

          <Form.Item label={editing ? 'Adicionar novos arquivos' : 'Arquivos do exame'}>
            <Upload
              multiple
              fileList={newFiles}
              beforeUpload={() => false}
              onChange={({ fileList }) => setNewFiles(fileList)}
              accept=".pdf,image/*"
            >
              <Button icon={<PlusOutlined />}>Selecionar PDF ou imagem</Button>
            </Upload>
          </Form.Item>

          {editing && editing.files.length > 0 && (
            <Alert
              type="info"
              showIcon
              message={`${editing.files.length} arquivo(s) já vinculado(s). Use “Detalhes” para visualizar ou remover.`}
            />
          )}
        </Form>
      </Modal>

      <Modal
        title={selected?.name ?? 'Detalhes do exame'}
        open={detailsOpen}
        onCancel={() => setDetailsOpen(false)}
        footer={<Button onClick={() => setDetailsOpen(false)}>Fechar</Button>}
        width={820}
      >
        {selected && (
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            <Descriptions bordered column={{ xs: 1, sm: 2 }}>
              <Descriptions.Item label="Especialidade">{selected.specialty?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Profissional">{selected.professional?.name ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusInfo[selected.status].color}>{statusInfo[selected.status].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Instituição">{selected.institution ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Solicitado em">{formatDate(selected.requestedAt)}</Descriptions.Item>
              <Descriptions.Item label="Agendado para">{formatDate(selected.scheduledAt)}</Descriptions.Item>
              <Descriptions.Item label="Realizado em">{formatDate(selected.performedAt)}</Descriptions.Item>
              <Descriptions.Item label="Resultado recebido">{formatDate(selected.resultReceivedAt)}</Descriptions.Item>
              <Descriptions.Item label="Resumo" span={2}>{selected.resultSummary ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Avaliação médica" span={2}>{selected.medicalEvaluation ?? '—'}</Descriptions.Item>
              <Descriptions.Item label="Observações" span={2}>{selected.notes ?? '—'}</Descriptions.Item>
            </Descriptions>

            <Card size="small" title={`Arquivos (${selected.files.length})`}>
              {selected.files.length === 0 ? (
                <span>Nenhum arquivo vinculado.</span>
              ) : (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {selected.files.map((file) => (
                    <Card key={file.id} size="small">
                      <Row align="middle" justify="space-between" gutter={[12, 12]}>
                        <Col flex="auto">
                          <Space>
                            {file.contentType === 'application/pdf' ? <FilePdfOutlined /> : <FileImageOutlined />}
                            <div>
                              <div>{file.originalName}</div>
                              <small>{formatBytes(file.sizeBytes)}</small>
                            </div>
                          </Space>
                        </Col>
                        <Col>
                          <Space>
                            <Tooltip title="Visualizar">
                              <Button icon={<EyeOutlined />} onClick={() => void openFile(file.id, file.originalName)} />
                            </Tooltip>
                            <Tooltip title="Baixar">
                              <Button icon={<DownloadOutlined />} onClick={() => void openFile(file.id, file.originalName, true)} />
                            </Tooltip>
                            <Popconfirm
                              title="Remover arquivo?"
                              okText="Remover"
                              cancelText="Cancelar"
                              okButtonProps={{ danger: true }}
                              onConfirm={() => void deleteFile(selected.id, file.id)}
                            >
                              <Button danger icon={<DeleteOutlined />} />
                            </Popconfirm>
                          </Space>
                        </Col>
                      </Row>
                    </Card>
                  ))}
                </Space>
              )}
            </Card>
          </Space>
        )}
      </Modal>
    </>
  );
}
