import pandas as pd
import os

def match_graduation_year(list1_path, list2_path, output_path):
    """
    Matches graduation year from list1 to list2 based on Name.
    Assumes list1 has columns 'Name', 'Graduation Year' (or similar).
    Assumes list2 has column 'Name'.
    """
    print(f"Loading files:\n Source: {list1_path}\n Target: {list2_path}")
    
    try:
        # Load Excel files
        df1 = pd.read_excel(list1_path)
        df2 = pd.read_excel(list2_path)
        
        # Basic column name standardization (just in case, user can adjust)
        # We assume columns are roughly "名前" (Name) and "卒業年" (Graduation Year)
        # Let's try to detect them
        
        def find_col(df, keywords):
            for col in df.columns:
                if any(k in str(col) for k in keywords):
                    return col
            return None

        name_col_1 = find_col(df1, ['名前', 'Name', 'name', '氏名'])
        year_col_1 = find_col(df1, ['卒業', 'Year', 'year', '年度'])
        name_col_2 = find_col(df2, ['名前', 'Name', 'name', '氏名'])

        if not all([name_col_1, year_col_1, name_col_2]):
            print("Error: Could not automatically identify column names.")
            print(f"List 1 columns: {df1.columns.tolist()}")
            print(f"List 2 columns: {df2.columns.tolist()}")
            return

        print(f"Using columns: List1({name_col_1}, {year_col_1}) -> List2({name_col_2})")

        # Create a mapping dictionary from List 1
        # Drop duplicates in List 1 to avoid explosion, keeping first or last? Let's keep first.
        # Ensure we convert names to string for matching to avoid type mismatch
        df1[name_col_1] = df1[name_col_1].astype(str)
        df2[name_col_2] = df2[name_col_2].astype(str)
        
        mapping = df1.drop_duplicates(subset=[name_col_1]).set_index(name_col_1)[year_col_1]

        # Map to List 2
        # Create a new column "卒業年_転記" (Transferred Year)
        df2['卒業年'] = df2[name_col_2].map(mapping)

        # Save
        df2.to_excel(output_path, index=False)
        print(f"Successfully saved to {output_path}")
        print(df2.head())

    except Exception as e:
        print(f"An error occurred: {e}")

if __name__ == "__main__":
    base_dir = "/Users/hirokiemueshi/Desktop/卒業年照合/ZAI_VOL4"
    list1 = os.path.join(base_dir, "list1.xlsx")
    list2 = os.path.join(base_dir, "list2.xlsx")
    output = os.path.join(base_dir, "output.xlsx")
    
    match_graduation_year(list1, list2, output)
