import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Zap, Eye, EyeOff, RefreshCw, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import SEOPreview from './SEOPreview';
import { usePermissions } from '../../hooks/usePermissions';
import {
  validateSEO,
  analyzeSEO,
  generateAutoSEO,
  formatSEOScore,
  extractKeywords,
  SEO_LIMITS,
  type SEOValidationResult,
  type SEOAnalysis
} from '../../utils/seoUtils';
import { isSEOFeatureAvailable } from '../../utils/permissions';

interface SEOData {
  title: string;
  description: string;
  keywords: string[];
  canonicalUrl?: string;
}

interface SEOEditorProps {
  initialData?: Partial<SEOData>;
  contentData?: {
    title: string;
    description: string;
    category?: string;
    location?: string;
    tags?: string[];
    type: 'event' | 'blog';
  };
  onChange: (seoData: SEOData) => void;
  baseUrl?: string;
  path?: string;
  ogImage?: string;
  disabled?: boolean;
  content?: any; // Event or Blog object for permission checking
}

const SEOEditor: React.FC<SEOEditorProps> = ({
  initialData = {},
  contentData,
  onChange,
  baseUrl = 'https://gema-events.com',
  path = '',
  ogImage,
  disabled = false,
  content
}) => {
  const permissions = usePermissions();
  const [seoData, setSeoData] = useState<SEOData>({
    title: initialData.title || '',
    description: initialData.description || '',
    keywords: initialData.keywords || [],
    canonicalUrl: initialData.canonicalUrl || `${baseUrl}${path}`
  });

  const [keywordInput, setKeywordInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [validation, setValidation] = useState<SEOValidationResult | null>(null);
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);

  // Permission validation
  const permissionLevel = contentData
    ? permissions.getSEOPermissionLevel(contentData.type, content)
    : 'full';

  const canEditSEO = contentData
    ? permissions.validateSEOEditPermission(contentData.type, content, !content?._id)
    : { allowed: true };

  const isFeatureAvailable = (feature: string) => isSEOFeatureAvailable(feature, permissionLevel);
  const isActuallyDisabled = disabled || !canEditSEO.allowed;

  // Update parent component when data changes
  useEffect(() => {
    onChange(seoData);
  }, [seoData, onChange]);

  // Validate and analyze SEO when data changes
  useEffect(() => {
    const validationResult = validateSEO(seoData);
    const analysisResult = analyzeSEO(seoData);
    setValidation(validationResult);
    setAnalysis(analysisResult);
  }, [seoData]);

  const updateSeoData = (field: keyof SEOData, value: any) => {
    setSeoData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddKeyword = () => {
    if (keywordInput.trim() && seoData.keywords.length < SEO_LIMITS.KEYWORDS.MAX) {
      const newKeyword = keywordInput.trim().toLowerCase();
      if (!seoData.keywords.includes(newKeyword)) {
        updateSeoData('keywords', [...seoData.keywords, newKeyword]);
      }
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    updateSeoData('keywords', seoData.keywords.filter(k => k !== keyword));
  };

  const handleAutoGenerate = () => {
    if (!contentData) return;

    const autoSEO = generateAutoSEO(contentData);
    setSeoData(prev => ({
      ...prev,
      title: autoSEO.title,
      description: autoSEO.description,
      keywords: autoSEO.keywords
    }));
  };

  const handleExtractKeywords = () => {
    if (!contentData) return;

    const extractedKeywords = extractKeywords(
      `${contentData.title} ${contentData.description}`,
      SEO_LIMITS.KEYWORDS.OPTIMAL
    );

    const newKeywords = extractedKeywords.filter(
      keyword => !seoData.keywords.includes(keyword)
    );

    if (newKeywords.length > 0) {
      updateSeoData('keywords', [
        ...seoData.keywords,
        ...newKeywords.slice(0, SEO_LIMITS.KEYWORDS.MAX - seoData.keywords.length)
      ]);
    }
  };

  const getScoreColor = (score: number) => {
    const { color } = formatSEOScore(score);
    const colorMap = {
      green: 'text-green-600 bg-green-100',
      yellow: 'text-yellow-600 bg-yellow-100',
      orange: 'text-orange-600 bg-orange-100',
      red: 'text-red-600 bg-red-100'
    };
    return colorMap[color as keyof typeof colorMap] || colorMap.red;
  };

  const CharacterCounter = ({ current, max, optimal }: { current: number; max: number; optimal?: { min: number; max: number } }) => {
    const getColor = () => {
      if (current === 0) return 'text-gray-400';
      if (current > max) return 'text-red-500';
      if (optimal && current >= optimal.min && current <= optimal.max) return 'text-green-500';
      return 'text-yellow-500';
    };

    return (
      <span className={`text-xs font-medium ${getColor()}`}>
        {current}/{max}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* SEO Score and Actions */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">SEO Optimization</CardTitle>
            <div className="flex items-center space-x-3">
              {analysis && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getScoreColor(analysis.overallScore)}`}>
                  {analysis.overallScore}/100 - {formatSEOScore(analysis.overallScore).label}
                </div>
              )}
              <div className="flex space-x-1">
                {contentData && isFeatureAvailable('auto-generate') && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAutoGenerate}
                      disabled={isActuallyDisabled}
                      className="text-xs"
                      title={!canEditSEO.allowed ? canEditSEO.message : undefined}
                    >
                      <Zap className="w-3 h-3 mr-1" />
                      Auto-Generate
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExtractKeywords}
                      disabled={isActuallyDisabled}
                      className="text-xs"
                      title={!canEditSEO.allowed ? canEditSEO.message : undefined}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Extract Keywords
                    </Button>
                  </>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-xs"
                >
                  {showPreview ? (
                    <>
                      <EyeOff className="w-3 h-3 mr-1" />
                      Hide Preview
                    </>
                  ) : (
                    <>
                      <Eye className="w-3 h-3 mr-1" />
                      Show Preview
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Permission Warning */}
          {!canEditSEO.allowed && (
            <div className="flex items-center space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <Lock className="w-4 h-4 text-yellow-600 flex-shrink-0" />
              <span className="text-sm text-yellow-700">{canEditSEO.message}</span>
            </div>
          )}
          {/* Meta Title */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Meta Title
              </label>
              <CharacterCounter
                current={seoData.title.length}
                max={SEO_LIMITS.TITLE.MAX}
                optimal={SEO_LIMITS.TITLE}
              />
            </div>
            <Input
              value={seoData.title}
              onChange={(e) => updateSeoData('title', e.target.value)}
              placeholder="Enter SEO title (50-60 characters recommended)"
              disabled={isActuallyDisabled}
              className={seoData.title.length > SEO_LIMITS.TITLE.MAX ? 'border-red-300' : ''}
              title={!canEditSEO.allowed ? canEditSEO.message : undefined}
            />
          </div>

          {/* Meta Description */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Meta Description
              </label>
              <CharacterCounter
                current={seoData.description.length}
                max={SEO_LIMITS.DESCRIPTION.MAX}
                optimal={SEO_LIMITS.DESCRIPTION}
              />
            </div>
            <textarea
              value={seoData.description}
              onChange={(e) => updateSeoData('description', e.target.value)}
              placeholder="Enter SEO description (150-160 characters recommended)"
              disabled={isActuallyDisabled}
              rows={3}
              title={!canEditSEO.allowed ? canEditSEO.message : undefined}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${
                seoData.description.length > SEO_LIMITS.DESCRIPTION.MAX ? 'border-red-300' : ''
              }`}
            />
          </div>

          {/* Keywords */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Keywords ({seoData.keywords.length}/{SEO_LIMITS.KEYWORDS.MAX})
              </label>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {seoData.keywords.map((keyword, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {keyword}
                  {!isActuallyDisabled && (
                    <button
                      onClick={() => handleRemoveKeyword(keyword)}
                      className="ml-1 text-blue-600 hover:text-blue-800"
                      title={!canEditSEO.allowed ? canEditSEO.message : undefined}
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            {!isActuallyDisabled && seoData.keywords.length < SEO_LIMITS.KEYWORDS.MAX && (
              <div className="flex space-x-2">
                <Input
                  value={keywordInput}
                  onChange={(e) => setKeywordInput(e.target.value)}
                  placeholder="Add keyword"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddKeyword();
                    }
                  }}
                  className="flex-1"
                  title={!canEditSEO.allowed ? canEditSEO.message : undefined}
                />
                <Button
                  onClick={handleAddKeyword}
                  disabled={!keywordInput.trim()}
                  size="sm"
                  title={!canEditSEO.allowed ? canEditSEO.message : undefined}
                >
                  Add
                </Button>
              </div>
            )}
          </div>

          {/* Canonical URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canonical URL
            </label>
            <Input
              value={seoData.canonicalUrl}
              onChange={(e) => updateSeoData('canonicalUrl', e.target.value)}
              placeholder="https://gema-events.com/..."
              disabled={isActuallyDisabled}
              title={!canEditSEO.allowed ? canEditSEO.message : undefined}
            />
          </div>
        </CardContent>
      </Card>

      {/* SEO Analysis */}
      {validation && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center">
              {validation.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              )}
              SEO Analysis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Warnings */}
            {validation.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-red-700">Issues to Fix:</h4>
                {validation.warnings.map((warning, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-red-700">{warning}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Suggestions */}
            {validation.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-blue-700">Suggestions:</h4>
                {validation.suggestions.map((suggestion, index) => (
                  <div key={index} className="flex items-start space-x-2">
                    <CheckCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-blue-700">{suggestion}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Score Breakdown */}
            {analysis && (
              <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(analysis.titleScore).split(' ')[0]}`}>
                    {analysis.titleScore}
                  </div>
                  <div className="text-xs text-gray-600">Title</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(analysis.descriptionScore).split(' ')[0]}`}>
                    {analysis.descriptionScore}
                  </div>
                  <div className="text-xs text-gray-600">Description</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-bold ${getScoreColor(analysis.keywordScore).split(' ')[0]}`}>
                    {analysis.keywordScore}
                  </div>
                  <div className="text-xs text-gray-600">Keywords</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* SEO Preview */}
      {showPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">SEO Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <SEOPreview
              title={seoData.title || 'Your Title Here'}
              description={seoData.description || 'Your description here'}
              url={seoData.canonicalUrl || `${baseUrl}${path}`}
              ogImage={ogImage}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SEOEditor;