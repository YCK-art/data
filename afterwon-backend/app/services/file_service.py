import pandas as pd
import os
import uuid
import json
from datetime import datetime
from typing import Optional, Dict, Any
from ..core.config import settings

class FileService:
    _instance = None
    _file_metadata = {}
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(FileService, cls).__new__(cls)
            os.makedirs(settings.UPLOAD_FOLDER, exist_ok=True)
            cls._instance._load_metadata()
        return cls._instance
    
    @property
    def file_metadata(self):
        return FileService._file_metadata

    def get_file_metadata(self, file_id: str) -> Optional[Dict[str, Any]]:
        """Get metadata for a specific file by file_id"""
        return FileService._file_metadata.get(file_id)
    
    def _get_metadata_file_path(self):
        """Get the path for the metadata file"""
        return os.path.join(settings.UPLOAD_FOLDER, "file_metadata.json")
    
    def _load_metadata(self):
        """Load file metadata from disk on startup"""
        metadata_file = self._get_metadata_file_path()
        if os.path.exists(metadata_file):
            try:
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    loaded_metadata = json.load(f)
                
                # Validate that files still exist
                valid_metadata = {}
                for file_id, info in loaded_metadata.items():
                    if os.path.exists(info.get('file_path', '')):
                        valid_metadata[file_id] = info
                    else:
                        print(f"⚠️ File not found, removing metadata for: {file_id}")
                
                FileService._file_metadata = valid_metadata
                print(f"✅ Loaded {len(valid_metadata)} file metadata entries")
                
            except Exception as e:
                print(f"⚠️ Error loading metadata: {e}")
                FileService._file_metadata = {}
        else:
            print("📁 No existing metadata file found")
    
    def _save_metadata(self):
        """Save file metadata to disk"""
        metadata_file = self._get_metadata_file_path()
        try:
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(FileService._file_metadata, f, ensure_ascii=False, indent=2)
            print(f"💾 Saved metadata for {len(FileService._file_metadata)} files")
        except Exception as e:
            print(f"❌ Error saving metadata: {e}")
    
    async def save_and_parse_file(self, file_content: bytes, filename: str) -> Dict[str, Any]:
        """파일을 저장하고 파싱하여 메타데이터 반환"""
        file_id = str(uuid.uuid4())
        file_path = os.path.join(settings.UPLOAD_FOLDER, f"{file_id}_{filename}")
        
        # 파일 저장
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # 파일 파싱
        try:
            if filename.endswith('.csv'):
                df = self._read_csv_robust(file_path)
                    
            elif filename.endswith(('.xlsx', '.xls')):
                df = self._read_excel_robust(file_path)
            else:
                raise ValueError("지원하지 않는 파일 형식입니다.")
            
            # Data cleaning and preprocessing
            df_cleaned = self._clean_dataframe(df)
            
            # 종합적인 EDA 수행
            eda_results = self._perform_eda(df_cleaned)
            
            metadata = {
                "file_id": file_id,
                "filename": filename,
                "file_size": len(file_content),
                "columns": df_cleaned.columns.tolist(),
                "row_count": len(df_cleaned),
                "preview": eda_results["preview"]["head"],  # Extract just the head as list
                "eda": eda_results,  # 전체 EDA 결과 포함
                "uploaded_at": datetime.now(),
                "file_path": file_path
            }
            
            # 메타데이터 저장
            self.file_metadata[file_id] = {
                "filename": filename,
                "file_path": file_path,
                "file_size": len(file_content),  # 파일 크기 추가
                "uploaded_at": datetime.now().isoformat()
            }
            
            # 메타데이터를 디스크에 저장
            self._save_metadata()
            
            return metadata
        
        except Exception as e:
            # 파일 삭제
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e
    
    def get_dataframe(self, file_id: str) -> Optional[pd.DataFrame]:
        """파일 ID로 DataFrame 반환"""
        # 메타데이터에서 파일 정보 조회
        if file_id not in self.file_metadata:
            return None
            
        file_info = self.file_metadata[file_id]
        filename = file_info["filename"]
        file_path = file_info["file_path"]
        
        if not os.path.exists(file_path):
            return None
        
        try:
            if filename.endswith('.csv'):
                df = self._read_csv_robust(file_path)
                        
            elif filename.endswith(('.xlsx', '.xls')):
                df = self._read_excel_robust(file_path)
            else:
                return None
                
            # Apply the same cleaning as during upload
            return self._clean_dataframe(df)
            
        except Exception:
            return None
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and preprocess the DataFrame for better AI analysis"""
        cleaned_df = df.copy()
        
        # Remove completely empty rows and columns
        cleaned_df = cleaned_df.dropna(how='all').dropna(how='all', axis=1)
        
        # Remove duplicate rows
        if len(cleaned_df) > 1:
            cleaned_df = cleaned_df.drop_duplicates()
        
        # Clean column names
        cleaned_df.columns = cleaned_df.columns.str.strip().str.replace(r'\s+', ' ', regex=True)
        
        # Handle common data issues
        for col in cleaned_df.columns:
            if cleaned_df[col].dtype == 'object':
                # Strip whitespace from string columns
                cleaned_df[col] = cleaned_df[col].astype(str).str.strip()
                
                # Replace common null representations with actual NaN
                null_values = ['', 'null', 'NULL', 'None', 'NaN', 'nan', '-', 'N/A', 'n/a', 'NA']
                cleaned_df[col] = cleaned_df[col].replace(null_values, pd.NA)
                
                # Handle mixed case inconsistencies for categorical data
                if cleaned_df[col].nunique() < len(cleaned_df) * 0.5:  # Likely categorical
                    # Standardize case for categories with low cardinality
                    value_counts = cleaned_df[col].str.lower().value_counts()
                    if len(value_counts) <= 50:  # Only for reasonably sized categories
                        # Create a mapping from various cases to the most common case
                        case_mapping = {}
                        for value in cleaned_df[col].dropna().unique():
                            if pd.notna(value):
                                lower_val = str(value).lower()
                                # Find the most common case variation
                                similar_values = [v for v in cleaned_df[col].dropna().unique() 
                                                if str(v).lower() == lower_val]
                                if similar_values:
                                    # Use the most frequent case variation
                                    most_common = max(similar_values, key=lambda x: (cleaned_df[col] == x).sum())
                                    for similar in similar_values:
                                        case_mapping[similar] = most_common
                        
                        cleaned_df[col] = cleaned_df[col].map(case_mapping).fillna(cleaned_df[col])
        
        # Optimize data types after cleaning
        cleaned_df = self._optimize_dtypes(cleaned_df)
        
        return cleaned_df
    
    def _perform_eda(self, df: pd.DataFrame) -> Dict[str, Any]:
        """종합적인 탐색적 데이터 분석 수행"""
        eda = {}
        
        # 기본 정보
        eda["basic_info"] = {
            "shape": df.shape,
            "columns": df.columns.tolist(),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "memory_usage": f"{df.memory_usage(deep=True).sum() / 1024 / 1024:.2f} MB"
        }
        
        # 데이터 미리보기 - Return all data for table display
        eda["preview"] = {
            "head": df.to_dict('records'),  # Return all rows instead of just head(5)
            "tail": df.tail(3).to_dict('records')
        }
        
        # 결측값 분석
        missing_data = df.isnull().sum()
        eda["missing_data"] = {
            "total_missing": int(missing_data.sum()),
            "missing_by_column": missing_data[missing_data > 0].to_dict(),
            "missing_percentage": (missing_data / len(df) * 100)[missing_data > 0].round(2).to_dict()
        }
        
        # 데이터 타입 분석
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
        datetime_cols = df.select_dtypes(include=['datetime64']).columns.tolist()
        
        eda["column_types"] = {
            "numeric": numeric_cols,
            "categorical": categorical_cols,
            "datetime": datetime_cols,
            "numeric_count": len(numeric_cols),
            "categorical_count": len(categorical_cols),
            "datetime_count": len(datetime_cols)
        }
        
        # 숫자형 컬럼 통계
        if numeric_cols:
            numeric_stats = df[numeric_cols].describe()
            eda["numeric_statistics"] = {
                "summary": numeric_stats.round(2).to_dict(),
                "correlation_matrix": df[numeric_cols].corr().round(3).to_dict() if len(numeric_cols) > 1 else {}
            }
        
        # 범주형 컬럼 분석
        if categorical_cols:
            categorical_stats = {}
            for col in categorical_cols[:5]:  # 상위 5개 컬럼만 분석
                value_counts = df[col].value_counts().head(10)
                categorical_stats[col] = {
                    "unique_count": df[col].nunique(),
                    "top_values": value_counts.to_dict(),
                    "most_frequent": df[col].mode().iloc[0] if not df[col].mode().empty else None
                }
            eda["categorical_statistics"] = categorical_stats
        
        # 중복 데이터 분석
        eda["duplicates"] = {
            "duplicate_rows": int(df.duplicated().sum()),
            "duplicate_percentage": round(df.duplicated().sum() / len(df) * 100, 2)
        }
        
        # 데이터 품질 지표
        eda["data_quality"] = {
            "completeness": round((1 - df.isnull().sum().sum() / (df.shape[0] * df.shape[1])) * 100, 2),
            "uniqueness": round((1 - df.duplicated().sum() / len(df)) * 100, 2),
            "overall_quality": "높음" if df.isnull().sum().sum() / (df.shape[0] * df.shape[1]) < 0.05 else "보통"
        }
        
        # 추천 분석 방향
        recommendations = []
        if len(numeric_cols) > 1:
            recommendations.append("상관관계 분석 및 산점도 생성")
        if len(categorical_cols) > 0:
            recommendations.append("범주별 분포 분석 및 막대차트 생성")
        if eda["missing_data"]["total_missing"] > 0:
            recommendations.append("결측값 처리 및 영향 분석")
        if len(datetime_cols) > 0:
            recommendations.append("시계열 트렌드 분석")
        
        eda["recommendations"] = recommendations
        
        return eda
    
    def _read_csv_robust(self, file_path: str) -> pd.DataFrame:
        """Robust CSV reading with encoding and delimiter detection"""
        encodings = ['utf-8', 'utf-8-sig', 'cp949', 'euc-kr', 'latin-1', 'iso-8859-1']
        delimiters = [',', ';', '\t', '|']
        
        # Try different combinations of encoding and delimiter
        for encoding in encodings:
            for delimiter in delimiters:
                try:
                    # Test with a small sample first
                    sample = pd.read_csv(file_path, encoding=encoding, delimiter=delimiter, nrows=5)
                    
                    # Check if parsing was successful (more than 1 column or reasonable data)
                    if len(sample.columns) > 1 or (len(sample.columns) == 1 and not sample.iloc[0, 0].count(delimiter) > 2):
                        # Read the full file
                        df = pd.read_csv(file_path, encoding=encoding, delimiter=delimiter)
                        
                        # Clean column names
                        df.columns = df.columns.str.strip()
                        
                        # Basic data type optimization
                        df = self._optimize_dtypes(df)
                        
                        return df
                        
                except (UnicodeDecodeError, pd.errors.EmptyDataError, pd.errors.ParserError):
                    continue
        
        # If all combinations fail, try pandas' automatic detection
        try:
            df = pd.read_csv(file_path, encoding='utf-8', sep=None, engine='python')
            df.columns = df.columns.str.strip()
            return self._optimize_dtypes(df)
        except Exception as e:
            raise ValueError(f"CSV 파일을 읽을 수 없습니다. 파일 형식을 확인해주세요. 오류: {str(e)}")
    
    def _read_excel_robust(self, file_path: str) -> pd.DataFrame:
        """Robust Excel reading with sheet detection and error handling"""
        try:
            # Try to read the first sheet
            df = pd.read_excel(file_path, sheet_name=0, engine='openpyxl')
            
            # Clean column names
            df.columns = df.columns.str.strip()
            
            # Remove completely empty rows and columns
            df = df.dropna(how='all').dropna(how='all', axis=1)
            
            # Basic data type optimization
            df = self._optimize_dtypes(df)
            
            return df
            
        except Exception as e:
            # Try with xlrd engine for older Excel files
            try:
                df = pd.read_excel(file_path, sheet_name=0, engine='xlrd')
                df.columns = df.columns.str.strip()
                df = df.dropna(how='all').dropna(how='all', axis=1)
                return self._optimize_dtypes(df)
            except Exception:
                raise ValueError(f"Excel 파일을 읽을 수 없습니다. 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다. 오류: {str(e)}")
    
    def _optimize_dtypes(self, df: pd.DataFrame) -> pd.DataFrame:
        """Optimize data types for better memory usage and analysis"""
        optimized_df = df.copy()
        
        for col in optimized_df.columns:
            # Skip if column is already datetime
            if pd.api.types.is_datetime64_any_dtype(optimized_df[col]):
                continue
                
            # Try to convert object columns to more specific types
            if optimized_df[col].dtype == 'object':
                # Check if column name suggests it's a date column
                is_likely_date = any(date_indicator in col.lower() for date_indicator in 
                                   ['date', 'time', 'day', 'month', 'year', 'created', 'updated', 'timestamp'])
                
                # Try datetime conversion first if column name suggests date
                if is_likely_date:
                    try:
                        datetime_version = self._smart_datetime_conversion(optimized_df[col])
                        # For date columns, use lower threshold (60% instead of 80%)
                        if datetime_version.notna().sum() / len(optimized_df) > 0.6:
                            optimized_df[col] = datetime_version
                            continue
                    except:
                        pass
                
                # Try to convert to numeric
                try:
                    # Remove common non-numeric characters and try conversion
                    cleaned = optimized_df[col].astype(str).str.replace(r'[^\d.-]', '', regex=True)
                    numeric_version = pd.to_numeric(cleaned, errors='coerce')
                    
                    # If more than 80% of values can be converted to numeric, use it
                    if numeric_version.notna().sum() / len(optimized_df) > 0.8:
                        optimized_df[col] = numeric_version
                        continue
                except:
                    pass
                
                # Try to convert to datetime with enhanced parsing (for non-date named columns)
                if not is_likely_date:
                    try:
                        datetime_version = self._smart_datetime_conversion(optimized_df[col])
                        # If more than 80% of values can be converted to datetime, use it
                        if datetime_version.notna().sum() / len(optimized_df) > 0.8:
                            optimized_df[col] = datetime_version
                            continue
                    except:
                        pass
                
                # For categorical data with few unique values, convert to category
                unique_ratio = optimized_df[col].nunique() / len(optimized_df)
                if unique_ratio < 0.5 and optimized_df[col].nunique() < 100:
                    optimized_df[col] = optimized_df[col].astype('category')
            
            # Optimize numeric types
            elif pd.api.types.is_integer_dtype(optimized_df[col]):
                # Try to downcast integers
                optimized_df[col] = pd.to_numeric(optimized_df[col], downcast='integer')
            
            elif pd.api.types.is_float_dtype(optimized_df[col]):
                # Try to downcast floats
                optimized_df[col] = pd.to_numeric(optimized_df[col], downcast='float')
        
        return optimized_df
    
    def _smart_datetime_conversion(self, series: pd.Series) -> pd.Series:
        """Enhanced datetime conversion with support for various date formats"""
        import re
        
        # First try standard pandas datetime conversion
        try:
            standard_conversion = pd.to_datetime(series, errors='coerce')
            if standard_conversion.notna().sum() / len(series) > 0.7:
                return standard_conversion
        except:
            pass
        
        # Handle custom formats like MDDYYYY, MMDDYYYY, etc.
        def parse_custom_date(date_str):
            if pd.isna(date_str) or date_str == '':
                return pd.NaT
            
            # Convert to string and remove any non-digits
            date_str = str(date_str).strip()
            
            # Handle purely numeric date formats (MDDYYYY, MMDDYYYY)
            if re.match(r'^\d{7,8}$', date_str):
                # Handle formats like 8292025 (MDDYYYY) or 09112025 (MMDDYYYY)
                if len(date_str) == 7:  # MDDYYYY
                    month = date_str[0:1]
                    day = date_str[1:3]
                    year = date_str[3:7]
                elif len(date_str) == 8:  # MMDDYYYY
                    month = date_str[0:2]
                    day = date_str[2:4]
                    year = date_str[4:8]
                else:
                    return pd.NaT
                
                try:
                    # Construct proper date string
                    formatted_date = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    return pd.to_datetime(formatted_date, errors='coerce')
                except:
                    return pd.NaT
            
            # Handle other potential formats
            # YYYYMMDD
            if re.match(r'^\d{8}$', date_str) and date_str.startswith('20'):
                try:
                    return pd.to_datetime(date_str, format='%Y%m%d', errors='coerce')
                except:
                    pass
            
            # DDMMYYYY
            if re.match(r'^\d{8}$', date_str):
                try:
                    day = date_str[0:2]
                    month = date_str[2:4]
                    year = date_str[4:8]
                    formatted_date = f"{year}-{month}-{day}"
                    return pd.to_datetime(formatted_date, errors='coerce')
                except:
                    pass
            
            # Default pandas parsing for other formats
            try:
                return pd.to_datetime(date_str, errors='coerce')
            except:
                return pd.NaT
        
        # Apply custom parsing
        try:
            parsed_series = series.apply(parse_custom_date)
            return parsed_series
        except:
            # Fallback to standard conversion
            return pd.to_datetime(series, errors='coerce')