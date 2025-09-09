import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import { 
  FaChevronRight, 
  FaChevronDown, 
  FaEdit, 
  FaTrash, 
  FaPlus, 
  FaEye, 
  FaEyeSlash,
  FaDrag,
  FaStar,
  FaRegStar
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import { RootState, AppDispatch } from '../../store';
import { 
  fetchCategoryTree,
  fetchCategories,
  toggleCategoryStatus,
  toggleFeaturedStatus,
  deleteCategory,
  reorderCategories,
  selectCategoryTree,
  selectCategoriesLoading
} from '../../store/slices/categoriesSlice';
import type { Category } from '../../services/api/categoriesAPI';
import LoadingSpinner from '../common/LoadingSpinner';
import Modal from '../interactive/Modal';
import CategoryForm from '../forms/CategoryForm';

interface CategoryTreeProps {
  onCategorySelect?: (category: Category) => void;
  onCategoryEdit?: (category: Category) => void;
  onCategoryCreate?: (parentId?: string) => void;
  showActions?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  showInactive?: boolean;
  maxDepth?: number;
  className?: string;
  compact?: boolean;
}

interface TreeNodeProps {
  category: Category;
  level: number;
  isSelected?: boolean;
  onToggle: (categoryId: string) => void;
  onSelect?: (category: Category) => void;
  onEdit?: (category: Category) => void;
  onDelete: (category: Category) => void;
  onAddChild: (parentId: string) => void;
  onToggleStatus: (category: Category) => void;
  onToggleFeatured: (category: Category) => void;
  expandedNodes: Set<string>;
  showActions: boolean;
  draggable: boolean;
  compact: boolean;
  maxDepth: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  category,
  level,
  isSelected = false,
  onToggle,
  onSelect,
  onEdit,
  onDelete,
  onAddChild,
  onToggleStatus,
  onToggleFeatured,
  expandedNodes,
  showActions,
  draggable,
  compact,
  maxDepth
}) => {
  const hasChildren = category.children && category.children.length > 0;
  const isExpanded = expandedNodes.has(category._id);
  const canAddChildren = level < maxDepth;

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (hasChildren) {
      onToggle(category._id);
    }
  };

  const handleSelect = () => {
    onSelect?.(category);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit?.(category);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${category.name}"?`)) {
      onDelete(category);
    }
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddChild(category._id);
  };

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleStatus(category);
  };

  const handleToggleFeatured = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFeatured(category);
  };

  return (
    <div className="select-none">
      <Draggable 
        draggableId={category._id} 
        index={category.order || 0}
        isDragDisabled={!draggable}
      >
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            className={`
              group flex items-center py-2 px-3 rounded-md cursor-pointer transition-all duration-200
              ${isSelected ? 'bg-blue-100 border-l-4 border-blue-500' : 'hover:bg-gray-50'}
              ${!category.isActive ? 'opacity-60' : ''}
              ${snapshot.isDragging ? 'shadow-lg bg-white border' : ''}
              ${compact ? 'py-1 text-sm' : ''}
            `}
            style={{ marginLeft: `${level * (compact ? 16 : 20)}px` }}
            onClick={handleSelect}
          >
            {draggable && (
              <div
                {...provided.dragHandleProps}
                className="mr-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <FaDrag size={12} />
              </div>
            )}

            {/* Toggle button */}
            <button
              onClick={handleToggle}
              className={`mr-2 p-1 hover:bg-gray-200 rounded transition-colors ${
                hasChildren ? 'text-gray-600' : 'text-transparent'
              }`}
            >
              {hasChildren ? (
                isExpanded ? <FaChevronDown size={12} /> : <FaChevronRight size={12} />
              ) : (
                <div className="w-3 h-3" />
              )}
            </button>

            {/* Category icon */}
            {category.icon && (
              <span className="mr-2 text-lg">{category.icon}</span>
            )}

            {/* Category name */}
            <span className={`flex-1 truncate ${isSelected ? 'font-medium' : ''}`}>
              {category.name}
            </span>

            {/* Category badges */}
            <div className="flex items-center space-x-1 mr-2">
              {category.isFeatured && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                  <FaStar size={10} className="mr-1" />
                  Featured
                </span>
              )}
              
              {!category.isActive && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Inactive
                </span>
              )}

              {category.eventCount !== undefined && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {category.eventCount} events
                </span>
              )}
            </div>

            {/* Action buttons */}
            {showActions && (
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {canAddChildren && (
                  <button
                    onClick={handleAddChild}
                    className="p-1 text-green-600 hover:bg-green-100 rounded transition-colors"
                    title="Add child category"
                  >
                    <FaPlus size={12} />
                  </button>
                )}
                
                <button
                  onClick={handleToggleFeatured}
                  className={`p-1 rounded transition-colors ${
                    category.isFeatured 
                      ? 'text-yellow-600 hover:bg-yellow-100' 
                      : 'text-gray-400 hover:bg-gray-100'
                  }`}
                  title={category.isFeatured ? 'Remove from featured' : 'Add to featured'}
                >
                  {category.isFeatured ? <FaStar size={12} /> : <FaRegStar size={12} />}
                </button>

                <button
                  onClick={handleToggleStatus}
                  className={`p-1 rounded transition-colors ${
                    category.isActive 
                      ? 'text-gray-600 hover:bg-gray-100' 
                      : 'text-red-600 hover:bg-red-100'
                  }`}
                  title={category.isActive ? 'Deactivate' : 'Activate'}
                >
                  {category.isActive ? <FaEye size={12} /> : <FaEyeSlash size={12} />}
                </button>

                <button
                  onClick={handleEdit}
                  className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
                  title="Edit category"
                >
                  <FaEdit size={12} />
                </button>

                <button
                  onClick={handleDelete}
                  className="p-1 text-red-600 hover:bg-red-100 rounded transition-colors"
                  title="Delete category"
                >
                  <FaTrash size={12} />
                </button>
              </div>
            )}
          </div>
        )}
      </Draggable>

      {/* Children */}
      {hasChildren && isExpanded && (
        <Droppable droppableId={`children-${category._id}`} type="CATEGORY">
          {(provided) => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {category.children!.map((child) => (
                <TreeNode
                  key={child._id}
                  category={child}
                  level={level + 1}
                  isSelected={isSelected}
                  onToggle={onToggle}
                  onSelect={onSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onAddChild={onAddChild}
                  onToggleStatus={onToggleStatus}
                  onToggleFeatured={onToggleFeatured}
                  expandedNodes={expandedNodes}
                  showActions={showActions}
                  draggable={draggable}
                  compact={compact}
                  maxDepth={maxDepth}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      )}
    </div>
  );
};

const CategoryTree: React.FC<CategoryTreeProps> = ({
  onCategorySelect,
  onCategoryEdit,
  onCategoryCreate,
  showActions = true,
  draggable = true,
  selectable = true,
  showInactive = false,
  maxDepth = 5,
  className = '',
  compact = false
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const categoryTree = useSelector(selectCategoryTree);
  const isLoading = useSelector(selectCategoriesLoading);

  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<string | undefined>();

  useEffect(() => {
    dispatch(fetchCategoryTree());
  }, [dispatch]);

  // Auto-expand root categories
  useEffect(() => {
    if (categoryTree.length > 0 && expandedNodes.size === 0) {
      const rootIds = categoryTree.map(cat => cat._id);
      setExpandedNodes(new Set(rootIds));
    }
  }, [categoryTree]);

  const handleToggleNode = (categoryId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
  };

  const handleSelectCategory = (category: Category) => {
    if (selectable) {
      setSelectedCategory(category);
      onCategorySelect?.(category);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setModalMode('edit');
    setShowModal(true);
    onCategoryEdit?.(category);
  };

  const handleCreateCategory = (parentId?: string) => {
    setParentId(parentId);
    setEditingCategory(null);
    setModalMode('create');
    setShowModal(true);
    onCategoryCreate?.(parentId);
  };

  const handleDeleteCategory = async (category: Category) => {
    try {
      await dispatch(deleteCategory(category._id)).unwrap();
    } catch (error) {
      // Error handled in slice
    }
  };

  const handleToggleStatus = async (category: Category) => {
    try {
      await dispatch(toggleCategoryStatus({ id: category._id, isActive: !category.isActive })).unwrap();
    } catch (error) {
      // Error handled in slice
    }
  };

  const handleToggleFeatured = async (category: Category) => {
    try {
      await dispatch(toggleFeaturedStatus({ id: category._id, isFeatured: !category.isFeatured })).unwrap();
    } catch (error) {
      // Error handled in slice
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;

    // Extract category IDs in new order
    const categoryIds = categoryTree.map(cat => cat._id);
    const [removed] = categoryIds.splice(result.source.index, 1);
    categoryIds.splice(result.destination.index, 0, removed);

    try {
      await dispatch(reorderCategories(categoryIds)).unwrap();
    } catch (error) {
      // Error handled in slice
    }
  };

  const handleModalSuccess = () => {
    setShowModal(false);
    dispatch(fetchCategoryTree()); // Refresh the tree
  };

  const handleModalCancel = () => {
    setShowModal(false);
    setEditingCategory(null);
    setParentId(undefined);
  };

  const expandAll = () => {
    const getAllIds = (categories: Category[]): string[] => {
      return categories.reduce((acc: string[], cat) => {
        acc.push(cat._id);
        if (cat.children) {
          acc.push(...getAllIds(cat.children));
        }
        return acc;
      }, []);
    };
    
    setExpandedNodes(new Set(getAllIds(categoryTree)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  const filteredTree = showInactive 
    ? categoryTree 
    : categoryTree.filter(cat => cat.isActive);

  return (
    <div className={`bg-white rounded-lg shadow-sm ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-gray-900">Categories</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={expandAll}
              className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
            >
              Expand All
            </button>
            <button
              onClick={collapseAll}
              className="text-sm text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100"
            >
              Collapse All
            </button>
            {showActions && (
              <button
                onClick={() => handleCreateCategory()}
                className="flex items-center px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
              >
                <FaPlus size={12} className="mr-1" />
                Add Root Category
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tree */}
      <div className="p-4">
        {filteredTree.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p>No categories found.</p>
            {showActions && (
              <button
                onClick={() => handleCreateCategory()}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              >
                Create First Category
              </button>
            )}
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId="category-tree" type="CATEGORY">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}>
                  {filteredTree.map((category) => (
                    <TreeNode
                      key={category._id}
                      category={category}
                      level={0}
                      isSelected={selectedCategory?._id === category._id}
                      onToggle={handleToggleNode}
                      onSelect={handleSelectCategory}
                      onEdit={handleEditCategory}
                      onDelete={handleDeleteCategory}
                      onAddChild={handleCreateCategory}
                      onToggleStatus={handleToggleStatus}
                      onToggleFeatured={handleToggleFeatured}
                      expandedNodes={expandedNodes}
                      showActions={showActions}
                      draggable={draggable}
                      compact={compact}
                      maxDepth={maxDepth}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>

      {/* Category Form Modal */}
      <Modal
        isOpen={showModal}
        onClose={handleModalCancel}
        title={modalMode === 'create' ? 'Create Category' : 'Edit Category'}
        size="lg"
      >
        <CategoryForm
          category={editingCategory}
          mode={modalMode}
          onSuccess={handleModalSuccess}
          onCancel={handleModalCancel}
        />
      </Modal>
    </div>
  );
};

export default CategoryTree;