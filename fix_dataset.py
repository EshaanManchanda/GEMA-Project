import json
import os

file_path = 'ai-doc-chatbot/qna_training_dataset.json'
with open(file_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

new_data = []
for item in data:
    if not item:
        continue # skip empty dicts
    
    if 'instruction' in item and 'output' in item:
        # Convert Alpaca to Q&A
        q = item['instruction']
        if item.get('input'):
            q += '\n' + item['input']
        
        new_item = {
            'question': q,
            'answer': item['output']
        }
        if 'intent' in item:
            new_item['intent'] = item['intent']
        if 'filter_tag' in item:
            new_item['filter_tag'] = item['filter_tag']
        
        new_data.append(new_item)
    elif 'question' in item and 'answer' in item:
        new_data.append(item)
    else:
        print(f"Skipping unknown format item: {item}")

with open(file_path, 'w', encoding='utf-8') as f:
    json.dump(new_data, f, indent=2, ensure_ascii=False)

print(f"Fixed formatting. Original length: {len(data)}. New dataset size: {len(new_data)}.")
print(f"Removed {len(data) - len(new_data)} empty or invalid items.")
