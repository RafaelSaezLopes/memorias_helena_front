import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Card, Col, DatePicker, Descriptions, Empty, Form, Input, InputNumber, Modal, Popconfirm, Progress, Radio, Row, Select, Space, Spin, Statistic, Table, Tag, TimePicker, Typography, message } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { fluidIntakeService, type FluidIntakeApi, type FluidIntakeInput } from '../../services/fluidIntakeService';
import { voidingDiaryService, type VoidingDiaryApi, type VoidingDiaryInput } from '../../services/voidingDiaryService';

function occurredAt(date: Dayjs, time: Dayjs) { return date.hour(time.hour()).minute(time.minute()).second(0).millisecond(0).toISOString(); }
function errorText(error: unknown) {
  const e = error as { response?: { data?: { message?: string; title?: string } | string }; message?: string };
  const data = e.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (typeof data === 'object' && data) return data.message || data.title || 'Não foi possível concluir a operação.';
  return e.message || 'Não foi possível concluir a operação.';
}

export default function VoidingDiaryPage() {
  const { child } = useAuth();
  const [date, setDate] = useState(dayjs());
  const [voids, setVoids] = useState<VoidingDiaryApi[]>([]);
  const [fluids, setFluids] = useState<FluidIntakeApi[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voidOpen, setVoidOpen] = useState(false);
  const [fluidOpen, setFluidOpen] = useState(false);
  const [editingVoid, setEditingVoid] = useState<VoidingDiaryApi | null>(null);
  const [editingFluid, setEditingFluid] = useState<FluidIntakeApi | null>(null);
  const [voidForm] = Form.useForm();
  const [fluidForm] = Form.useForm();
  const leakage = Form.useWatch('leakage', voidForm);

  const load = useCallback(async () => {
    if (!child?.id) return;
    setLoading(true); setError(null);
    const from = date.startOf('day').toISOString(); const to = date.endOf('day').toISOString();
    try {
      const [v, f] = await Promise.all([voidingDiaryService.list(child.id, from, to), fluidIntakeService.list(child.id, from, to)]);
      setVoids(v); setFluids(f);
    } catch (e) { setVoids([]); setFluids([]); setError(errorText(e)); }
    finally { setLoading(false); }
  }, [child?.id, date]);

  useEffect(() => { void load(); }, [load]);

  const orderedVoids = useMemo(() => [...voids].sort((a,b) => dayjs(a.occurredAt).valueOf()-dayjs(b.occurredAt).valueOf()), [voids]);
  const orderedFluids = useMemo(() => [...fluids].sort((a,b) => dayjs(a.occurredAt).valueOf()-dayjs(b.occurredAt).valueOf()), [fluids]);
  const analysis = useMemo(() => {
    const urine = orderedVoids.reduce((s,x)=>s+(x.urineMl||0),0);
    const intake = orderedFluids.reduce((s,x)=>s+x.amountMl,0);
    const leaks = orderedVoids.filter(x=>x.leakage).length;
    const urgency = orderedVoids.filter(x=>x.urgency).length;
    const urinations = orderedVoids.filter(x=>(x.urineMl||0)>0).length;
    const average = urinations ? Math.round(urine/urinations) : 0;
    const notes:string[]=[];
    if (!orderedVoids.length && !orderedFluids.length) notes.push('Ainda não há registros para esta data.');
    if (urinations >= 8) notes.push('Foram registrados oito ou mais episódios urinários no dia.');
    if (leaks) notes.push(`${leaks} episódio(s) de perda de urina na calcinha.`);
    if (urgency) notes.push(`${urgency} episódio(s) acompanhado(s) de urgência.`);
    if (intake > 0 && urine > intake*1.25) notes.push('O volume de urina está maior que a ingestão registrada; confira se todas as bebidas foram lançadas.');
    if (orderedVoids.length && !leaks && !urgency) notes.push('Nenhuma perda ou urgência foi registrada neste dia.');
    return { urine, intake, leaks, urgency, urinations, average, balance:intake-urine, notes };
  }, [orderedVoids, orderedFluids]);

  const newVoid = () => { setEditingVoid(null); voidForm.resetFields(); voidForm.setFieldsValue({date,time:dayjs(),leakage:false,urgency:false}); setVoidOpen(true); };
  const editVoid = (x:VoidingDiaryApi) => { const d=dayjs(x.occurredAt); setEditingVoid(x); voidForm.setFieldsValue({date:d,time:d,urineMl:x.urineMl,leakage:x.leakage,leakageLevel:x.leakageLevel,urgency:x.urgency,moment:x.moment,notes:x.notes}); setVoidOpen(true); };
  const newFluid = () => { setEditingFluid(null); fluidForm.resetFields(); fluidForm.setFieldsValue({date,time:dayjs(),beverage:'Água'}); setFluidOpen(true); };
  const editFluid = (x:FluidIntakeApi) => { const d=dayjs(x.occurredAt); setEditingFluid(x); fluidForm.setFieldsValue({date:d,time:d,amountMl:x.amountMl,beverage:x.beverage,notes:x.notes}); setFluidOpen(true); };

  const saveVoid = async () => {
    if (!child?.id) return message.error('Nenhuma criança vinculada.');
    const v=await voidForm.validateFields();
    const input:VoidingDiaryInput={childId:child.id,occurredAt:occurredAt(v.date,v.time),urineMl:v.urineMl??null,leakage:Boolean(v.leakage),leakageLevel:v.leakage?v.leakageLevel||null:null,urgency:Boolean(v.urgency),moment:v.moment||null,notes:v.notes?.trim()||null};
    setSaving(true); try { editingVoid?await voidingDiaryService.update(editingVoid.id,input):await voidingDiaryService.create(input); message.success('Evento miccional salvo no banco.'); setVoidOpen(false); setEditingVoid(null); setDate(v.date); await load(); } catch(e){message.error(errorText(e));} finally{setSaving(false);}
  };
  const saveFluid = async () => {
    if (!child?.id) return message.error('Nenhuma criança vinculada.');
    const v=await fluidForm.validateFields();
    const input:FluidIntakeInput={childId:child.id,occurredAt:occurredAt(v.date,v.time),amountMl:v.amountMl,beverage:v.beverage?.trim()||null,notes:v.notes?.trim()||null};
    setSaving(true); try { editingFluid?await fluidIntakeService.update(editingFluid.id,input):await fluidIntakeService.create(input); message.success('Ingestão de líquido salva no banco.'); setFluidOpen(false); setEditingFluid(null); setDate(v.date); await load(); } catch(e){message.error(errorText(e));} finally{setSaving(false);}
  };
  const removeVoid=async(id:string)=>{try{await voidingDiaryService.remove(id);message.success('Registro excluído.');await load();}catch(e){message.error(errorText(e));}};
  const removeFluid=async(id:string)=>{try{await fluidIntakeService.remove(id);message.success('Ingestão excluída.');await load();}catch(e){message.error(errorText(e));}};

  return <>
    <PageHeader title="Diário miccional" subtitle="Registre separadamente micções e ingestão de líquidos ao longo do dia." extra={<Space><Button icon={<ReloadOutlined/>} onClick={()=>void load()}>Atualizar</Button><Button type="primary" icon={<PlusOutlined/>} onClick={newVoid}>Novo xixi</Button></Space>} />
    {error && <Alert type="error" showIcon message={error} action={<Button onClick={()=>void load()}>Tentar novamente</Button>} style={{marginBottom:16}}/>}
    <Card style={{marginBottom:16}}><Space wrap><Typography.Text strong>Dia analisado:</Typography.Text><DatePicker value={date} onChange={d=>d&&setDate(d)} format="DD/MM/YYYY" allowClear={false}/></Space></Card>
    <Row gutter={[16,16]} style={{marginBottom:16}}>
      <Col xs={12} md={8} xl={4}><Card><Statistic title="Micções" value={analysis.urinations} suffix="vezes"/></Card></Col>
      <Col xs={12} md={8} xl={4}><Card><Statistic title="Urina total" value={analysis.urine} suffix="ml"/></Card></Col>
      <Col xs={12} md={8} xl={4}><Card><Statistic title="Ingestão hídrica" value={analysis.intake} suffix="ml"/></Card></Col>
      <Col xs={12} md={8} xl={4}><Card><Statistic title="Média por micção" value={analysis.average} suffix="ml"/></Card></Col>
      <Col xs={12} md={8} xl={4}><Card><Statistic title="Perdas" value={analysis.leaks} suffix="episódios"/></Card></Col>
      <Col xs={12} md={8} xl={4}><Card><Statistic title="Urgências" value={analysis.urgency} suffix="episódios"/></Card></Col>
    </Row>
    <Row gutter={[16,16]} style={{marginBottom:16}}>
      <Col xs={24} xl={14}><Card title="Registros de xixi" extra={<Button type="primary" icon={<PlusOutlined/>} onClick={newVoid}>Registrar xixi</Button>}><Spin spinning={loading}><Table rowKey="id" dataSource={orderedVoids} pagination={false} locale={{emptyText:<Empty description="Nenhuma micção registrada"/>}} scroll={{x:850}} columns={[
        {title:'Horário',width:85,render:(_,r)=>dayjs(r.occurredAt).format('HH:mm')},{title:'Momento',dataIndex:'moment',width:150,render:v=>v||'-'},{title:'Xixi',dataIndex:'urineMl',width:90,render:v=>`${v||0} ml`},{title:'Perda',dataIndex:'leakage',width:135,render:(v,r)=>v?<Tag color="orange">SIM {r.leakageLevel?`- ${r.leakageLevel}`:''}</Tag>:<Tag>NÃO</Tag>},{title:'Urgência',dataIndex:'urgency',width:100,render:v=><Tag color={v?'red':'green'}>{v?'SIM':'NÃO'}</Tag>},{title:'Observações',dataIndex:'notes',ellipsis:true,render:v=>v||'-'},{title:'Ações',fixed:'right' as const,width:105,render:(_,r)=><Space><Button icon={<EditOutlined/>} onClick={()=>editVoid(r)}/><Popconfirm title="Excluir registro?" onConfirm={()=>void removeVoid(r.id)}><Button danger icon={<DeleteOutlined/>}/></Popconfirm></Space>}
      ]}/></Spin></Card></Col>
      <Col xs={24} xl={10}><Card title="Ingestão de líquidos por horário" extra={<Button type="primary" icon={<PlusOutlined/>} onClick={newFluid}>Registrar líquido</Button>}><Spin spinning={loading}><Table rowKey="id" dataSource={orderedFluids} pagination={false} locale={{emptyText:<Empty description="Nenhum líquido registrado"/>}} columns={[
        {title:'Horário',width:85,render:(_,r)=>dayjs(r.occurredAt).format('HH:mm')},{title:'Quantidade',dataIndex:'amountMl',width:110,render:v=><strong>{v} ml</strong>},{title:'Líquido',dataIndex:'beverage',render:v=>v||'-'},{title:'Ações',width:105,render:(_,r)=><Space><Button icon={<EditOutlined/>} onClick={()=>editFluid(r)}/><Popconfirm title="Excluir ingestão?" onConfirm={()=>void removeFluid(r.id)}><Button danger icon={<DeleteOutlined/>}/></Popconfirm></Space>}
      ]}/></Spin><Alert style={{marginTop:16}} type="info" showIcon message={`Total ingerido no dia: ${analysis.intake} ml`} description="Registre cada copo, mamadeira ou outra bebida no horário em que foi consumida."/></Card></Col>
    </Row>
    <Card title="Análise do dia"><Descriptions column={{xs:1,md:3}} bordered size="small"><Descriptions.Item label="Balanço registrado"><strong>{analysis.balance>=0?'+':''}{analysis.balance} ml</strong></Descriptions.Item><Descriptions.Item label="Com perda">{orderedVoids.length?Math.round(analysis.leaks/orderedVoids.length*100):0}% das micções</Descriptions.Item><Descriptions.Item label="Com urgência">{orderedVoids.length?Math.round(analysis.urgency/orderedVoids.length*100):0}% das micções</Descriptions.Item></Descriptions><Typography.Text strong style={{display:'block',marginTop:18}}>Relação urina / ingestão registrada</Typography.Text><Progress percent={analysis.intake?Math.min(100,Math.round(analysis.urine/analysis.intake*100)):0}/><Space direction="vertical" style={{width:'100%',marginTop:12}}>{analysis.notes.map((n,i)=><Alert key={i} type={n.includes('Nenhuma')?'success':'info'} showIcon message={n}/>)}</Space><Alert style={{marginTop:12}} type="warning" showIcon message="Esta análise é apenas organizacional" description="Os dados devem ser avaliados pelo profissional responsável."/></Card>

    <Modal title={editingVoid?'Editar registro de xixi':'Novo registro de xixi'} open={voidOpen} onCancel={()=>{setVoidOpen(false);setEditingVoid(null);}} onOk={()=>void saveVoid()} okText="Salvar no banco" confirmLoading={saving} destroyOnHidden width={680}><Form form={voidForm} layout="vertical"><Row gutter={16}><Col span={12}><Form.Item name="date" label="Data" rules={[{required:true}]}><DatePicker format="DD/MM/YYYY" style={{width:'100%'}}/></Form.Item></Col><Col span={12}><Form.Item name="time" label="Horário" rules={[{required:true}]}><TimePicker format="HH:mm" style={{width:'100%'}}/></Form.Item></Col></Row><Form.Item name="urineMl" label="Quantidade de xixi (ml)" rules={[{required:true,message:'Informe o volume'}]}><InputNumber min={0} max={3000} addonAfter="ml" style={{width:'100%'}}/></Form.Item><Form.Item name="moment" label="Momento/situação"><Select allowClear showSearch options={['Ao acordar','Antes de dormir','Após refeição','Na escola','Brincando','Durante viagem','Consulta/exame','Outro'].map(x=>({value:x,label:x}))}/></Form.Item><Row gutter={16}><Col span={12}><Form.Item name="leakage" label="Perdeu xixi na calcinha?" rules={[{required:true}]}><Radio.Group optionType="button" buttonStyle="solid"><Radio.Button value={false}>Não</Radio.Button><Radio.Button value={true}>Sim</Radio.Button></Radio.Group></Form.Item></Col><Col span={12}>{leakage&&<Form.Item name="leakageLevel" label="Intensidade" rules={[{required:true}]}><Select options={[{value:'PEQUENA',label:'Pequena'},{value:'MEDIA',label:'Média'},{value:'GRANDE',label:'Grande'}]}/></Form.Item>}</Col></Row><Form.Item name="urgency" label="Foi com urgência?" rules={[{required:true}]}><Radio.Group optionType="button" buttonStyle="solid"><Radio.Button value={false}>Não</Radio.Button><Radio.Button value={true}>Sim</Radio.Button></Radio.Group></Form.Item><Form.Item name="notes" label="Observações"><Input.TextArea rows={3} maxLength={1000} showCount/></Form.Item></Form></Modal>

    <Modal title={editingFluid?'Editar ingestão de líquido':'Registrar ingestão de líquido'} open={fluidOpen} onCancel={()=>{setFluidOpen(false);setEditingFluid(null);}} onOk={()=>void saveFluid()} okText="Salvar no banco" confirmLoading={saving} destroyOnHidden width={560}><Form form={fluidForm} layout="vertical"><Row gutter={16}><Col span={12}><Form.Item name="date" label="Data" rules={[{required:true}]}><DatePicker format="DD/MM/YYYY" style={{width:'100%'}}/></Form.Item></Col><Col span={12}><Form.Item name="time" label="Horário da ingestão" rules={[{required:true}]}><TimePicker format="HH:mm" style={{width:'100%'}}/></Form.Item></Col></Row><Form.Item name="amountMl" label="Quantidade ingerida" rules={[{required:true,message:'Informe a quantidade'}]}><InputNumber min={1} max={5000} addonAfter="ml" style={{width:'100%'}}/></Form.Item><Form.Item name="beverage" label="Tipo de líquido"><Input placeholder="Água, leite, suco..." maxLength={120}/></Form.Item><Form.Item name="notes" label="Observações"><Input.TextArea rows={3} maxLength={500} showCount/></Form.Item></Form></Modal>
  </>;
}
