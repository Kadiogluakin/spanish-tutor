import LessonCatalog from '@/components/LessonCatalog';

export default function LessonsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto container-padding py-8">
        <LessonCatalog />
      </div>
    </div>
  );
}