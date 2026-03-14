import React from 'react';
import { FormField } from '@/types/registration';
import { Eye } from 'lucide-react';
import RegistrationFormField from './RegistrationFormField';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';

interface FormBuilderPreviewProps {
  fields: FormField[];
}

const FormBuilderPreview: React.FC<FormBuilderPreviewProps> = ({ fields }) => {
  // Group fields by section
  const groupedFields = fields.reduce((acc, field) => {
    const section = field.section || 'General Information';
    if (!acc[section]) {
      acc[section] = [];
    }
    acc[section].push(field);
    return acc;
  }, {} as Record<string, FormField[]>);

  if (fields.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600 mb-2">No Fields Yet</h3>
          <p className="text-sm text-gray-500">Add fields to see the preview</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded-r-lg">
        <div className="flex items-center">
          <Eye className="w-5 h-5 text-blue-600 mr-2" />
          <p className="text-sm font-medium text-blue-800">
            Preview Mode - This is how participants will see your form
          </p>
        </div>
      </div>

      {Object.entries(groupedFields).map(([section, sectionFields]) => (
        <Card key={section}>
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg">{section}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            {sectionFields.map((field) => (
              <RegistrationFormField
                key={field.id}
                field={field}
                value=""
                onChange={() => {}}
                disabled={true}
              />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FormBuilderPreview;
