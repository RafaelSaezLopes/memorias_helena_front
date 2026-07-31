import { DeleteOutlined, DownloadOutlined, FilePdfOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Card, Popconfirm, Select, Space, Table, Tag, Upload, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/PageHeader';
import { useAuth } from '../../contexts/AuthContext';
import { deleteDocument, downloadDocument, listDocuments, uploadDocument, type ChildDocument } from '../../services/documentsService';

export default function DocumentsPage() {
 const { child } = useAuth(); const [items,setItems]=useState<ChildDocument[]>([]); const [loading,setLoading]=useState(false); const [type,setType]=useState('Documento pessoal');
 const load=async()=>{ if(!child?.id)return; setLoading(true); try{setItems(await listDocuments(child.id));}catch(e){message.error(e instanceof Error?e.message:'Erro ao carregar documentos');}finally{setLoading(false)}};
 useEffect(()=>{void load()},[child?.id]);
 const upload=async(file:File)=>{if(!child?.id)return false; try{await uploadDocument(child.id,file,type);message.success('Documento salvo');await load();}catch(e){message.error(e instanceof Error?e.message:'Erro no upload')}return false};
 return <><PageHeader title="Documentos" subtitle="Certidões, carteirinhas, laudos e outros arquivos da Helena." extra={<Space><Select value={type} onChange={setType} style={{width:190}} options={['Documento pessoal','Certidão','Carteirinha do plano','Receita','Laudo','Outros'].map(x=>({value:x,label:x}))}/><Upload beforeUpload={upload} showUploadList={false} accept=".pdf,.png,.jpg,.jpeg"><Button type="primary" icon={<UploadOutlined/>}>Enviar documento</Button></Upload></Space>}/><Card><Table rowKey="id" loading={loading} dataSource={items} pagination={{pageSize:10}} columns={[
 {title:'Arquivo',dataIndex:'originalName',render:(v)=><Space><FilePdfOutlined/>{v}</Space>},
 {title:'Tipo',dataIndex:'relatedEntityType',render:(v)=><Tag>{v||'Documento'}</Tag>},
 {title:'Tamanho',dataIndex:'sizeBytes',render:(v:number)=>`${(v/1024/1024).toFixed(2)} MB`},
 {title:'Enviado em',dataIndex:'createdAt',render:(v)=>dayjs(v).format('DD/MM/YYYY HH:mm')},
 {title:'Ações',render:(_,r)=><Space><Button icon={<DownloadOutlined/>} onClick={()=>void downloadDocument(r.id,r.originalName)}>Baixar</Button><Popconfirm title="Excluir documento?" onConfirm={async()=>{await deleteDocument(r.id);message.success('Documento excluído');await load()}}><Button danger icon={<DeleteOutlined/>}/></Popconfirm></Space>}
 ]}/></Card></>;
}
