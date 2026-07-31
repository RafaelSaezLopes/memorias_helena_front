import { PictureOutlined } from '@ant-design/icons';
import { Skeleton } from 'antd';
import { useEffect, useState } from 'react';
import { albumsService } from '../services/albumsService';

type Props = {
  fileId?: string | null;
  alt: string;
  className?: string;
  fallback?: string;
  onClick?: () => void;
};

export function AuthenticatedImage({ fileId, alt, className, fallback, onClick }: Props) {
  const [src, setSrc] = useState<string | undefined>(fallback);
  const [loading, setLoading] = useState(Boolean(fileId));

  useEffect(() => {
    let objectUrl: string | undefined;
    let active = true;

    if (!fileId) {
      setSrc(fallback);
      setLoading(false);
      return;
    }

    setLoading(true);
    albumsService.getFileBlob(fileId)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => active && setSrc(fallback))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [fileId, fallback]);

  if (loading) return <Skeleton.Image active className={className} />;
  if (!src) return <div className={`image-empty ${className ?? ''}`}><PictureOutlined /></div>;
  return <img src={src} alt={alt} className={className} onClick={onClick} />;
}
