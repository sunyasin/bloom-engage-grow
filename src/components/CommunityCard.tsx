import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useI18n } from '@/lib/i18n';

interface CommunityCardProps {
  id: string;
  name: string;
  description?: string | null;
  coverImageUrl?: string | null;
  memberCount: number;
}

export const CommunityCard = ({ id, name, description, coverImageUrl, memberCount }: CommunityCardProps) => {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div
      onClick={() => navigate(`/community/${id}`)}
      className="group cursor-pointer rounded-xl overflow-hidden bg-card border border-border shadow-soft hover:shadow-medium transition-smooth"
    >
      <div className="aspect-video bg-muted relative overflow-hidden">
        {coverImageUrl ? (
          <img 
            src={coverImageUrl} 
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-primary opacity-20" />
        )}
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-foreground group-hover:text-primary transition-smooth line-clamp-1">
          {name}
        </h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {description}
          </p>
        )}
        <div className="flex items-center gap-1 mt-3 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>{memberCount.toLocaleString()} {t('home.members')}</span>
        </div>
      </div>
    </div>
  );
};
