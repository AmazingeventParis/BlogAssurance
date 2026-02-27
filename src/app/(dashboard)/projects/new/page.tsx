import { ProjectForm } from '@/components/projects/project-form'

export const metadata = {
  title: 'Nouveau projet - BlogAssurance',
}

export default function NewProjectPage() {
  return (
    <div className="container max-w-4xl py-8">
      <ProjectForm />
    </div>
  )
}
